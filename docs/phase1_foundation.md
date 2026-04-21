# Phase 1 HealthEx Access And Retrieval Foundation

## Purpose

Phase 1 establishes the real technical foundation for the rest of the exercise.
The foundation is now based on direct HealthEx access with the repository
owner's own record, not on synthetic or prepackaged demo data.

This phase should:
- lock the main application stack
- define the local setup expectations
- confirm the working HealthEx access path
- establish the minimum project structure needed for the UI and later AI work
- leave a clean handoff for Phase 2 shaping work

This phase should not try to finish the final UI, immunization engine, or Claude skill.

## Status

Phase 1 is complete and closed out.

Completed outcomes:
- locked the main app stack and local environment contract
- scaffolded the initial Next.js application shell
- validated HealthEx browser-token access for the repository owner's record
- confirmed that JWT `sub` works as the `Person` ID for `$everything`
- implemented a browser-side live fetch flow inside the app
- kept an optional local snapshot fallback under `tmp/healthex-fhir/`

Phase 2 now owns:
- refining the FHIR shaping logic for the real record
- deciding which two supported FHIR resource types should lead the summary
- improving the section-level summary quality and readability

## Locked Decisions

| Topic | Decision | Notes |
|---|---|---|
| Main application stack | Next.js + TypeScript | Matches HealthEx usage patterns and keeps the deliverable reviewer-friendly |
| Python usage | Support tooling only | Python can still help with diagnostics, but it is not part of the shipped application |
| Patient strategy | Use the repository owner's own HealthEx record only | Removes confusion from synthetic/demo datasets and matches the validated access path |
| App shape | Single web app | Avoid separate services unless later work proves they are necessary |
| Primary retrieval path | Browser-side live fetch using the patient token | This is the access path that is currently validated end-to-end |

## Phase 1 Scope

### In scope

- decide and document the stack
- define the local setup expectations
- define the basic folder structure
- validate the HealthEx auth and patient-ID path
- confirm how the first live FHIR retrieval works in code

### Out of scope

- final UI design
- immunization recommendation logic
- Claude skill packaging
- deep testing beyond setup and access validation

## Validated Access Path

The working Phase 1 access path is:

1. Sign in to `app.healthex.io`.
2. Open DevTools and read `container.authManager.token`.
3. Decode the JWT and use `sub` as the HealthEx `Person` ID.
4. Fetch `GET /FHIR/R4/Person/{personId}/$everything` in the browser.
5. Render the bundle through the app's shared shaping logic.

What is validated:
- browser-side FHIR fetch works with the copied patient token
- the token is short-lived
- copied patient tokens currently return `403` from terminal or server-side requests in this repo

## Current Repo Structure

Phase 1 leaves the following active top-level areas:
- `src/app/` for the Next.js App Router application
- `src/components/` for UI components such as the live viewer
- `src/lib/` for FHIR bundle shaping and local fallback logic
- `docs/` for phase docs and execution notes
- `scripts/` for helper tooling that may be useful if a longer-lived credential path is added later
- root config and env example files only as needed

## Setup Expectations

Current setup decisions:
- use `environment.yml` with `python=3.11` and `nodejs=22`
- use `.env.example` as the starting point for any scripted HealthEx env values
- keep both `HEALTHEX_FHIR_BASE_URL` and `NEXT_PUBLIC_FHIR_BASE_URL` available while live browser fetch remains part of the app flow

Default bootstrap flow:

```bash
conda env create -f environment.yml
conda activate healthex-tse
npm install
npm run dev
```

Notes:
- this is the standard setup flow future agents should expect
- `.env.example` should be copied to `.env` only when local scripted values are needed
- `npm run build` and lint-level validation have already succeeded in this repo

## Handoff To Phase 2

Phase 2 should be able to start with no ambiguity about:
- which stack to build in
- where application code belongs
- which patient record is in scope
- how the current live HealthEx retrieval path works
- which limitations still exist around token lifetime and server-side access

## Immediate Checklist

- [x] Lock the stack to Next.js + TypeScript
- [x] Lock Python to a support-tool role only
- [x] Lock the patient strategy to the repository owner's own HealthEx record
- [x] Scaffold the initial application structure
- [x] Define environment variables and setup instructions
- [x] Validate the browser-side HealthEx FHIR access path
- [x] Hand off shaping and summary work to Phase 2
