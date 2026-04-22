# HealthEx Technical Exercise

Three deliverables for the HealthEx candidate exercise:

1. **Clinical history web app** — a Next.js + TypeScript viewer that fetches a patient's record from the HealthEx FHIR R4 server with a short-lived browser token and renders a readable, tabbed clinical summary (Conditions, Medications, Labs, Vitals, Immunizations).
2. **Claude skill `immunization-gap-analysis`** — an uploadable skill that sits on top of the HealthEx MCP connector inside Claude, reviews all-time immunization history against bundled CDC/ACIP and ECDC schedules, and proposes a corrective action plan. Prebuilt ZIP at `releases/immunization-gap-analysis-v1.1.0.zip`.
3. **Production-grade data-quality handling** — three real ambiguities I hit against my own HealthEx record, each fixed in the shaping layer and locked in by a targeted vitest test. See [Data Quality: Production-Grade Handling](#data-quality-production-grade-handling) below.

See `HealthEx_TSE_Exercise.md` for the original brief.

## Setup And Run

```bash
conda env create -f environment.yml
conda activate healthex-tse
npm install
npm run dev
```

Then open `http://localhost:3000`.

`.env` is only needed if you want to run the scripted pull helper (`npm run pull:healthex`) or the streamed AI chart summary (`OPENAI_API_KEY`). Copy `.env.example` if so.

## Using The Web App

1. Sign in to `app.healthex.io`.
2. In DevTools, read `container.authManager.token`.
3. Paste it into the app's source bar. The app decodes `sub` to use as the `Person` ID, calls `GET /FHIR/R4/Person/{sub}/$everything`, follows pagination, and renders tabs.

If a saved bundle exists under `tmp/healthex-fhir/`, it loads as a fallback while the token is not set. The copied token is short-lived and currently only works from the browser context; the same token returns `403` from server-side and terminal requests, so the app's primary flow is browser-side.

## Installing The Claude Skill

1. Download `releases/immunization-gap-analysis-v1.1.0.zip`.
2. In Claude: `Customize -> Skills -> + Create skill` and upload the ZIP.
3. Make sure the HealthEx connector is connected under `Settings -> Connectors -> HealthEx`.
4. Ask something like `Am I up to date on my vaccines?`.

The skill source lives at `claude-skills/healthex-immunization-gap/`. See `SKILL.md` there for the workflow and `TESTING.md` for the live prompt matrix.

## Architecture

- `src/app/` — Next.js App Router entrypoint and streaming API routes (`/api/chart-summary`, `/api/record-chat`)
- `src/components/live-healthex-viewer.tsx` — browser-side token paste, paginated FHIR fetch, tabbed review UI with per-item sparklines and timelines
- `src/components/streaming-chart-summary.tsx` — streaming opening summary and grounded follow-up chat
- `src/lib/healthex-summary.ts` — shared FHIR bundle shaping: CVX-first immunization grouping, sentinel-allergy suppression, multi-identity reconciliation
- `src/lib/local-healthex-bundle.ts` — optional fallback loader for saved snapshots under `tmp/healthex-fhir/`
- `src/lib/record-selection.ts` — shared pin-selection context so the tabs and the chat card see the same pinned rows
- `claude-skills/healthex-immunization-gap/` — uploadable Claude skill: `SKILL.md`, Python helpers for parse/normalize/compare/format, bundled CDC and ECDC schedule snapshots, CVX mapping, and fixture-backed smoke tests
- `scripts/pull-healthex-record.mjs` — helper for scripted FHIR pulls when a longer-lived token is available

## Data Quality: Production-Grade Handling

While pulling my own record off the live HealthEx FHIR server I saw three classes of ambiguity that any serious integrator has to handle before their product can trust the data. Each one has a plausible naive read that silently corrupts the downstream experience, and each one is a realistic failure mode for a health-data integration vendor sitting between a messy upstream source and a downstream app that wants clean structured resources.

Each gap is:

- **Detected and fixed** in the shared shaping layer (`src/lib/healthex-summary.ts`), so every consumer — the web app, the opening chart summary, the grounded chat — inherits the fix
- **Counted on a `dataQualityFlags`** field on `HealthExSummary` so the handling is always auditable, not invisible
- **Locked in by a unit test** in [`src/lib/__tests__/healthex-summary.test.ts`](src/lib/__tests__/healthex-summary.test.ts) that runs on minimal FHIR fixtures, requires no network and no API key, and asserts the exact behavior a naive consumer would have gotten wrong

Run the suite with:

```bash
npm run test
```

### Gap A — "Absence" encoded as a positive record

**Symptom.** HealthEx sometimes returns an `AllergyIntolerance` with SNOMED `716186003` ("No known allergy"), `clinicalStatus = active`, `verificationStatus = confirmed`.

**Naive behavior.** A rendering layer that trusts the status fields would display `"You have an active allergy: No Known Allergies"`. A rules engine keyed off "active, confirmed allergy" would apply contraindication logic to it. Both are wrong.

**Production fix.** `src/lib/healthex-summary.ts` suppresses the SNOMED sentinels (`716186003`, `409137002`, `429625007`) before the allergy section is built, renders `"No allergies on file."` instead, and increments `dataQualityFlags.sentinelAllergiesSuppressed` so the suppression is observable from tests and instrumentation.

**Test that proves it.** `"suppresses SNOMED 716186003 'no known allergy' sentinel records"` asserts a bundle whose only allergy is the sentinel renders an empty allergy section with `sentinelAllergiesSuppressed === 1` and a matching note.

### Gap B — Multiple Patient identities linked from one Person

**Symptom.** The hydrated Person resource has `Person.link[]` pointing at two different `Patient/{id}` references, and clinical resources attach to either one. This is the classic enterprise master-patient-index (eMPI) fan-out shape any production HealthEx integration will hit.

**Naive behavior.** Any consumer that assumes `Person.id === Patient.id` and filters clinical resources by that single ID silently drops half the record. The patient looks like they have no labs, no immunizations, no problem list — with zero error and zero warning.

**Production fix.** `buildSummaryFromBundle` refuses to filter by a single Patient ID (locked in with an inline `Contract:` comment), walks `Person.link` plus every `subject.reference` / `patient.reference` across the bundle, and exposes the reconciled identity set as `summary.patientIdentities` so downstream consumers can reason over every identity linked to the Person. `dataQualityFlags.mergedPatientIdentities` records the fan-out count.

**Test that proves it.** `"retains records attached to any Patient identity linked from the Person"` builds a Person linked to two Patient IDs, attaches one Observation to one and one Immunization to the other, and asserts both tabs render one row. Without the fix, one of those tabs is silently empty.

### Gap C — Same vaccine, drifting display text

**Symptom.** HealthEx returns the administering system's free-text product label (`"Tdap"`, `"Tdap #2"`, `"Tdap Adacel"`) per dose. The CVX code stays constant across all of them. Against my own record, 59 raw `Immunization` resources collapse to ~27 rows once CVX grouping is applied.

**Naive behavior.** Any gap analysis or dose counter keyed off `vaccineCode.text` over-counts distinct vaccines and under-counts doses of each — which for an immunization-gap tool is the exact failure mode that produces clinically misleading output. This is why the Claude skill keys off CVX too (see `claude-skills/healthex-immunization-gap/scripts/normalize_immunizations.py`).

**Production fix.** `buildImmunizationItems` groups by CVX first, falls back to label normalization only when CVX is absent, exposes the shared CVX code in the row metadata (reviewers see `CVX 115` inline), and increments `dataQualityFlags.immunizationsGroupedByCvx` with the number of label variants CVX grouping rescued.

**Test that proves it.** `"groups immunizations by CVX across drifting display text"` builds three Immunization resources sharing CVX `115` with three different display-text variants and asserts they collapse into a single row with `occurrenceCount === 3`, a `CVX 115` metadata chip, and no `"#2"` suffix leaking into the display label.

### Why this framing matters

A clean UI on a clean bundle is not the hard part of a HealthEx integration — a clean UI on the real, messy, partially normalized bundle is. Treating these three gaps as an explicit core deliverable with tests, instead of silently filtering or reformatting them in the UI layer, is how I would land this change on a production codebase.

## Chart-As-Chat (Stretch AI Extension)

The opening chart summary is turn 1 of a grounded conversation. Double-click any row in the clinical tabs to pin it as extra context (up to 12 pins, 10 most recent occurrences per pin), then ask the compose box a question like "Given these records, do I appear immune to hep B?". Pins are snapshotted per user turn so past answers keep their original context. The streams live in `src/app/api/chart-summary/route.ts` and `src/app/api/record-chat/route.ts`.

## Tradeoffs

- The browser-token FHIR flow is the path that is currently validated end-to-end, but the same token is server-side forbidden in this repo, so the app is intentionally browser-first rather than a full server integration.
- The skill ships bundled CDC/ECDC schedule snapshots, not a full production forecasting engine. Some adult, travel, and risk-based questions intentionally resolve to `context required`.
- The local snapshot fallback under `tmp/healthex-fhir/` lags the live hydrated record (the saved bundle is mostly `Binary`). It is documented as fallback-only so reviewers do not confuse it with the live view.
- The chat extension is deliberately scoped: no RAG over the full bundle, no persistence across refreshes, no tool calls. It stays grounded in the opening summary and up to 12 pinned rows.

## With More Time

- replace the copied-token flow with a durable HealthEx auth path so server-side fetches work
- add a "Compare to CDC" action on the Immunizations tab that reuses the skill's bundled schedule JSON end-to-end inside the web app
- refresh the saved bundle so the local fallback matches the richer live hydrated state
- finish live end-to-end verification of the Claude skill against disconnected, stale, and known-good HealthEx test accounts

## AI Disclosure And Process

Per the brief ("You are also free to use AI as you see fit, as long as you clearly identify where AI was used"):

- I used AI coding assistants (Cursor with Claude and GPT-family models) throughout the build for code generation, refactors, FHIR schema reasoning, and doc drafting. Every shipped file was reviewed and edited by me.
- The Claude skill itself is an AI deliverable by design: its `SKILL.md`, reference docs, and Python helpers are the artifact. They were iterated against live Claude runs on my own HealthEx record.
- The web app's opening chart summary and follow-up chat stream from OpenAI `o4-mini`; this is a runtime AI feature, not a build-time artifact.
- Clinical schedule content in `claude-skills/healthex-immunization-gap/references/` is author-curated from public CDC/ACIP and ECDC sources. See `docs/medical-disclaimer.md` for the non-clinical-advice disclaimer that ships with the skill.

I ran this as a multi-agent project: one agent per phase, a shared plan, and explicit handoff docs so context did not get lost between sessions. The `docs/` folder is the project memory and is intentionally preserved with the submission as evidence of how the work was scoped, executed, and validated — see [docs/README.md](docs/README.md) for the index, `docs/agent-readme.md` for the operating rules, `docs/implementation-plan.md` for the living decisions, and the `docs/phase1..phase6` files for the per-phase execution logs.

## License

MIT. See `LICENSE`.
