# Immunization Gap Analysis Skill

Analyze HealthEx immunization records against bundled CDC or ECDC guidance and
get a corrective-action plan grounded in the user's available record history.

## Prerequisites

- Claude Pro or Claude Max access
- Claude skill uploads enabled in the user's account
- HealthEx connector installed and authenticated in Claude
- access to the user's HealthEx records through that connector

## Install

1. Download `releases/immunization-gap-analysis-v1.0.0.zip`.
2. In Claude, go to `Customize -> Skills -> + Create skill` and upload the ZIP.
3. Enable the skill, then confirm the HealthEx connector is connected under
   `Settings -> Connectors -> HealthEx`.

## Example Prompts

- `Am I up to date on my vaccines?`
- `What vaccines do I still need based on my HealthEx records?`
- `When did I last get a Tdap?`
- `Do I appear immune to measles?`
- `What shots or boosters should I ask my clinician about next?`

## Example Output Excerpt

```text
Patient context
- age band: adult
- full paginated history pull completed: yes

Record freshness
- last synced: 2026-04-21

Potential gaps or overdue items
- Influenza: likely due - no recent dose appears within the expected annual window
- Tdap or Td booster: possibly due pending missing history - the latest recorded dose appears older than the expected booster interval

Corrective actions to consider
- confirm outside vaccination history
- discuss indicated vaccination with a clinician or pharmacist
- verify whether any recent vaccines are missing from stale or unsynced records

immunization-gap-analysis v1.0.0 · CDC Recommended Adult Immunization Schedule 2026-04-21 · synced 2026-04-21
```

## Medical Disclaimer

This skill is for informational review of HealthEx-connected records only. It is
not medical advice, may miss vaccines given outside connected systems, and
should be treated as a records-based summary rather than a definitive clinical
forecast. Confirm any gaps or next steps with a qualified clinician.

See [docs/medical-disclaimer.md](docs/medical-disclaimer.md) for the fuller
repo-level disclaimer.

## Limitations

- the skill only sees records available through the user's HealthEx connector
- stale sync state can make a user appear due when the real issue is an outdated
  chart
- some vaccine recommendations require country, risk, contraindication, travel,
  or shared decision-making context that may not be available
- the bundled schedule snapshots are author-curated public references, not a
  full production immunization forecasting engine

## Releases And Versioning

- public ZIP: `releases/immunization-gap-analysis-v1.0.0.zip`
- skill changelog: `claude-skills/healthex-immunization-gap/CHANGELOG.md`
- source package: `claude-skills/healthex-immunization-gap`

## Repo Context

This repository still contains the full technical implementation and project
memory for the HealthEx candidate exercise.

### Project Goal

The technical portion of the exercise is to:
- build a simple Web UI that displays a patient's clinical history in a readable format
- fetch patient data from the HealthEx FHIR R4 API
- use at least two required FHIR resource types in the summary
- build a Claude skill using the HealthEx MCP server to identify immunization gaps and propose corrective actions

## Current Direction

The project is now centered on a single patient-source strategy: the user's own
HealthEx record.

Current assumptions:
- live FHIR access is driven by a short-lived patient token copied from `app.healthex.io`
- the JWT `sub` works as the HealthEx `Person` ID for `GET /FHIR/R4/Person/{id}/$everything`
- the browser can successfully fetch the patient's bundle directly, while the
  same copied token currently returns `403` from terminal or server-side requests
- the app therefore treats browser-side live fetch as the primary retrieval path
- a locally saved bundle under `tmp/healthex-fhir/` is an optional development fallback
- the live hydrated state is more authoritative than the saved local fallback if the two disagree

Historical note:
- this repository initially explored a Synthea-based demo-data workflow, but it
  has fully pivoted to the personal-record HealthEx workflow above

## Repo Guide

- `README.md`: evaluator-facing overview
- `IMPLEMENTATION_PLAN.md`: living technical source of truth, decisions, and TODOs
- `AGENT_README.md`: operating rules for agents working in this directory
- `HealthEx_TSE_Exercise.md`: original assignment brief
- `HealthEx_api_reference.md`: HealthEx connector behavior and schema notes for skill development
- `LICENSE`: public redistribution license for the skill package
- `releases/`: prebuilt public skill ZIP artifacts
- `src/app`: Next.js App Router entrypoint for the web UI
- `src/components/live-healthex-viewer.tsx`: browser-side live FHIR fetch flow
- `src/lib/healthex-summary.ts`: shared FHIR bundle-to-summary shaping logic
- `src/lib/local-healthex-bundle.ts`: local snapshot fallback loader
- `scripts/pull-healthex-record.mjs`: helper script for longer-lived or future server-usable HealthEx credentials
- `claude-skills/healthex-immunization-gap`: uploadable Claude skill package for immunization-gap review through the HealthEx connector
- `docs/phase1_foundation.md`: Phase 1 HealthEx access and retrieval foundation
- `docs/phase2_fhir_queries_shaping.md`: Phase 2 shaping and summary-section handoff
- `docs/phase3_clinical_history_ui.md`: Phase 3 UI execution notes
- `docs/phase4_claude_immunization_skill.md`: Phase 4 combined immunization and Claude/MCP notes
- `docs/phase5_extensions_validation.md`: Phase 5 validation and polish notes
- `docs/phase6_readme_submission.md`: Phase 6 evaluator-facing documentation notes
- `docs/medical-disclaimer.md`: repo-level medical disclaimer for public skill packaging

## Setup And Run

### Quick Start

```bash
conda env create -f environment.yml
conda activate healthex-tse
npm install
npm run dev
```

### Local Setup

1. Run `cp .env.example .env`.
2. Fill in `.env` only if you are testing a scripted HealthEx pull with a
   reusable token or explicit `Person` ID override.
3. Start the app with `npm run dev`.
4. Open `http://localhost:3000`.
5. Paste a current HealthEx patient token into the live viewer and let the app
   derive the `Person` ID from the JWT `sub`.

## Current Retrieval Flow

The app supports two ways of working:

### 1. Primary path: live browser fetch

This is the current supported flow for development and demo work.

1. Sign in to `app.healthex.io`.
2. Open DevTools and read `container.authManager.token`.
3. Paste the token into the app's live fetch form.
4. The app decodes `sub`, calls `GET /FHIR/R4/Person/{sub}/$everything`, follows
   pagination, and renders the supported FHIR sections.

Important limitation:
- this copied patient token expires quickly and should be treated as a temporary
  developer credential, not a durable integration token

### 2. Optional local snapshot fallback

If a bundle has already been saved under `tmp/healthex-fhir/`, the app can read
the latest snapshot and render it as a fallback.

This is useful when:
- you want to iterate on the UI without re-fetching immediately
- you want a stable local sample during short-lived token windows

Important caveat:
- the saved fallback can become stale and may underrepresent the richer live browser pull

## Claude Skill Source

The repo now includes an uploadable Claude skill package at
`claude-skills/healthex-immunization-gap`.

The skill is designed to sit on top of the HealthEx connector inside Claude and
is intentionally separate from the browser-token FHIR flow used by the local web
app.

Reviewer notes:

1. Open the folder and inspect `SKILL.md` plus the `references/` files.
2. Prefer the prebuilt release ZIP so Claude receives the public
   `immunization-gap-analysis/` folder as the ZIP root.
3. Connect HealthEx in Claude and allow tool access before asking for an
   immunization-gap review.

Current skill behavior:

- activates for immunization-history, vaccine-gap, overdue-vaccine, catch-up,
  corrective-action, last-vaccine, and selected immunity/titer questions
- uses `CDC/ACIP` as the clinical recommendation source and `CDC CDSi` as the
  implementation companion
- expects live HealthEx connector access and should ask the user to connect
  HealthEx rather than guessing from incomplete context
- starts with `update_and_check_recent_records`, then paginates
  `get_immunizations` across the full history
- normalizes immunization records by `CVX` and `OccurrenceDate`, not by the
  free-text vaccine label
- conditionally pulls `get_labs` for titer-aware immunity questions and other
  HealthEx tools only when context requires them
- returns freshness, data-quality flags, likely current items, likely gaps,
  corrective actions, assumptions, and a non-clinical disclaimer

## Technical Notes

- FHIR base URL: `https://api.healthex.io/FHIR/R4`
- Primary query pattern: `GET /Person/{personId}/$everything`
- Current app strategy: browser-side fetch plus shared client/server shaping logic
- Current summary behavior: automatically ranks up to two supported lead sections from the active bundle and flags document-heavy snapshots
- Current token limitation: copied patient tokens work in the browser runtime but
  currently return `403` from terminal and server-side requests in this repo

## Tradeoffs So Far

- The live browser-token flow is fast to validate and aligns with what is
  already working today, but it is not the long-term auth architecture we would
  want for a production integration.
- Keeping a local bundle fallback improves iteration speed, but it can lag
  behind the live record if it is not refreshed.
- The latest observed live hydrated state is stronger than the saved local snapshot
  and already surfaces at least two useful structured sections: `Immunization`
  and `MedicationRequest`.
- The latest saved local snapshot is still mostly `Binary` data, so it should be
  treated as a stale fallback rather than the best representation of the current record.

## With More Time

- replace the temporary copied-token flow with a more durable HealthEx auth path
- refresh the saved bundle so the local fallback matches the richer live hydrated state
- clarify the best route for immunization data if it is not reliably exposed in
  the current FHIR response
- validate the live HealthEx connector workflow end to end against the shipped
  skill package

## Additional Documentation

- See `IMPLEMENTATION_PLAN.md` for the living backlog and decision log.
- See `AGENT_README.md` for repository-specific agent rules.
- See `docs/phase1_foundation.md` for the completed access and setup foundation.
- See `docs/phase2_fhir_queries_shaping.md` for the active shaping handoff.