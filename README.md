# HealthEx Technical Exercise

This repository contains the technical planning and implementation work for the HealthEx candidate exercise.

## Project Goal

The technical portion of the exercise is to:
- build a simple Web UI that displays a patient's clinical history in a readable format
- fetch patient data from the HealthEx FHIR R4 API
- use at least two required FHIR resource types in the summary
- build a Claude skill using the HealthEx MCP server to identify immunization gaps and propose corrective actions

## Current Status

Phase 1 foundation work is complete. The repository is now entering Phase 2 FHIR/API investigation and data-shaping work.

At the moment, this repo contains:
- the original assignment brief in `HealthEx_TSE_Exercise.txt`
- the living technical plan in `IMPLEMENTATION_PLAN.md`
- agent operating rules in `AGENT_README.md`
- the Phase 1 foundation doc in `docs/phase1_foundation.md`
- the shared local environment files `environment.yml` and `.env.example`
- the committed demo patient dataset in `data/patients`
- the initial Next.js application scaffold in `src/app`
- the root app config in `package.json`, `tsconfig.json`, `next.config.ts`, and `eslint.config.mjs`
- the remaining phase docs in `docs/`

## Repo Guide

- `README.md`: evaluator-facing overview
- `IMPLEMENTATION_PLAN.md`: living technical source of truth, decisions, and TODOs
- `AGENT_README.md`: operating rules for agents working in this directory
- `package.json`: app scripts and JavaScript dependencies
- `data/patients`: committed synthetic FHIR bundles for the interactive demo set
- `src/app`: Next.js App Router entrypoint for the web UI
- `docs/phase1_foundation.md`: Phase 1 foundation decisions and setup notes
- `docs/phase2_fhir_queries_shaping.md`: Phase 2 API investigation and FHIR shaping handoff
- `docs/phase3_clinical_history_ui.md`: blank placeholder for Phase 3 work
- `docs/phase4_immunization_engine.md`: blank placeholder for Phase 4 work
- `docs/phase5_claude_skill.md`: blank placeholder for Phase 5 work
- `docs/phase6_extensions_validation.md`: blank placeholder for Phase 6 work
- `docs/phase7_readme_submission.md`: blank placeholder for Phase 7 work
- `HealthEx_TSE_Exercise.txt`: original exercise brief

## Setup And Run

The repository now includes a runnable Next.js scaffold and a shared local environment contract.

### Quick Start

```bash
conda env create -f environment.yml
conda activate healthex-tse
npm install
npm run dev
```

Use this as the default bootstrap flow for the repo.

Additional local setup:
1. Run `cp .env.example .env`.
2. Fill in `.env` as the HealthEx integration details are confirmed.
3. Start from the `src/app` scaffold and layer in FHIR retrieval and UI sections incrementally.

Current setup files:
- `environment.yml`: shared Conda environment with Python and Node.js
- `.env.example`: starter environment variables for FHIR access and patient selection
- `.gitignore`: protection for local env files and future build artifacts
- `data/patients`: committed reviewer-friendly synthetic patient dataset and manifest
- `src/app/page.tsx`: minimal landing page and Phase 1 placeholder UI

### Synthea Workflow Notes

Phase 1 uses Synthea as the primary synthetic-patient source.

Recommended local flow:
1. Use the shared Conda environment, which now includes Java for Synthea.
2. Download `synthea-with-dependencies.jar` or clone the Synthea repo outside this repository.
3. Generate a small exploratory batch into `tmp/synthea-output/`.
4. Inspect the exported FHIR bundles and shortlist about 5 strong candidates.

Example command:

```bash
java -jar synthea-with-dependencies.jar \
  -p 10 \
  -s 21 \
  --exporter.fhir.export=true \
  --exporter.baseDirectory="/absolute/path/to/HealthEx_TSE_Exercise/tmp/synthea-output"
```

See `docs/phase1_foundation.md` for the full curation workflow and selection criteria.

Current guidance from initial runs:
- use `-p 10` for fast exploration
- use `-a 18-65` when we want adult immunization-demo candidates
- treat the Synthea seed as a reproducible batch identifier, not the primary quality lever

Phase 1 also produced a committed 10-patient demo-ready Synthea set in `data/patients` plus a recommended primary patient and backups. The exact shortlist and tuned generation notes live in `docs/phase1_foundation.md`.

## Current Technical Direction

- Keep the implementation simple, readable, and demo-friendly.
- Use the repository plan as the shared source of truth while the build takes shape.
- Use Phase 1 to generate about 5 curated synthetic patients with Synthea for the downstream demo.
- Use `Next.js + TypeScript` for the application and Conda to standardize local setup.
- Keep the current UI shell minimal until the FHIR data-shaping work is ready.
- Keep Phase 2 API investigation and the first HealthEx integration pass with the same agent when possible for continuity.
- Keep phase docs reserved for phased execution and handoff notes as they are defined.

## Tradeoffs So Far

The main tradeoff so far is prioritizing clear planning and shared repository memory before implementation. That slows down coding slightly at the start, but it should make the eventual build cleaner, easier to hand off between agents, and easier for a reviewer to understand.

## With More Time

Once implementation begins, this README should be expanded with:
- actual setup and run commands
- architecture notes tied to the final stack
- screenshots or a short walkthrough of the UI
- a concise summary of final technical tradeoffs

## Additional Documentation

- See `IMPLEMENTATION_PLAN.md` for the living backlog and decision log.
- See `AGENT_README.md` for repository-specific agent rules.
- See `docs/phase1_foundation.md` for the current setup and environment assumptions.
- See `docs/phase2_fhir_queries_shaping.md` for the active HealthEx API and shaping handoff.