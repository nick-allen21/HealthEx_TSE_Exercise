# HealthEx Technical Exercise

This repository contains the technical implementation and project memory for the
HealthEx candidate exercise.

## Project Goal

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

Historical note:
- this repository initially explored a Synthea-based demo-data workflow, but it
  has fully pivoted to the personal-record HealthEx workflow above

## Repo Guide

- `README.md`: evaluator-facing overview
- `IMPLEMENTATION_PLAN.md`: living technical source of truth, decisions, and TODOs
- `AGENT_README.md`: operating rules for agents working in this directory
- `HealthEx_TSE_Exercise.md`: original assignment brief
- `src/app`: Next.js App Router entrypoint for the web UI
- `src/components/live-healthex-viewer.tsx`: browser-side live FHIR fetch flow
- `src/lib/healthex-summary.ts`: shared FHIR bundle-to-summary shaping logic
- `src/lib/local-healthex-bundle.ts`: local snapshot fallback loader
- `scripts/pull-healthex-record.mjs`: helper script for longer-lived or future server-usable HealthEx credentials
- `docs/phase1_foundation.md`: Phase 1 HealthEx access and retrieval foundation
- `docs/phase2_fhir_queries_shaping.md`: Phase 2 shaping and summary-section handoff
- `docs/phase3_clinical_history_ui.md`: Phase 3 UI execution notes
- `docs/phase4_immunization_engine.md`: Phase 4 immunization analysis notes
- `docs/phase5_claude_skill.md`: Phase 5 Claude/MCP integration notes
- `docs/phase6_extensions_validation.md`: Phase 6 validation and polish notes
- `docs/phase7_readme_submission.md`: Phase 7 evaluator-facing documentation notes

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
- The latest saved local snapshot is still mostly `Binary` data, so it currently
  validates `AllergyIntolerance` as the only clearly usable structured lead section.

## With More Time

- replace the temporary copied-token flow with a more durable HealthEx auth path
- refresh the saved bundle from a fuller live browser pull so a second supported
  lead section can be validated locally
- clarify the best route for immunization data if it is not reliably exposed in
  the current FHIR response
- finish the Claude skill and recommendation workflow with the final data shape

## Additional Documentation

- See `IMPLEMENTATION_PLAN.md` for the living backlog and decision log.
- See `AGENT_README.md` for repository-specific agent rules.
- See `docs/phase1_foundation.md` for the completed access and setup foundation.
- See `docs/phase2_fhir_queries_shaping.md` for the active shaping handoff.