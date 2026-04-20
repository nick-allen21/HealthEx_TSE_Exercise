# Phase 1 Foundation

## Purpose

Phase 1 establishes the minimum technical foundation for the rest of the exercise.

This phase should:
- lock the implementation stack
- define how synthetic patient data will be generated and evaluated
- establish the initial project structure and setup expectations
- leave a clean handoff for Phase 2 FHIR retrieval and shaping work

This phase should not try to build the full UI, immunization engine, or Claude skill.

## Status

Phase 1 is complete and closed out.

Completed outcomes:
- locked the main app stack and local environment contract
- scaffolded the initial Next.js application shell
- documented and tested the Synthea workflow locally
- tuned Synthea for demo usefulness in the local temp workflow
- packaged a local 10-patient demo-ready shortlist

Phase 2 now owns:
- HealthEx FHIR API investigation
- HealthEx MCP access investigation
- validation of how the selected patient data will flow through the HealthEx workflow
- exact FHIR query design and shaping work

## Locked Decisions

| Topic | Decision | Notes |
|---|---|---|
| Main application stack | Next.js + TypeScript | Matches HealthEx usage patterns and keeps the final deliverable reviewer-friendly |
| Python usage | Support tooling only | Python is allowed for helper scripts, quick data analysis, or one-off data prep, but not as a second runtime app |
| Patient strategy | Synthea is the primary demo-data path | We want to show credible familiarity with structured patient data generation and curation |
| App shape | Single web app | Avoid separate frontend and backend services unless later work proves they are necessary |

## Phase 1 Scope

### In scope

- decide and document the stack
- define the local setup expectations
- define the basic folder structure
- document how Synthea will be used
- define how we will judge whether a synthetic patient is strong enough for the demo
- clarify the open dependency on HealthEx FHIR access for the generated patient workflow

### Out of scope

- full FHIR query implementation
- final UI design
- immunization recommendation logic
- Claude skill packaging
- deep testing beyond setup validation

## Synthea Workflow

Phase 1 should treat Synthea as a curation workflow, not just a data dump.

Target output:
- about 5 synthetic patients
- enough clinical variation to support later UI sections
- at least one patient with useful immunization history for the analysis phase

Patient selection criteria:
- visible demographics that make the summary easy to read
- at least two of the allowed resource families likely to be useful in the UI
- enough Conditions, Observations, Medications, or Immunizations to avoid a thin demo
- no obviously broken or trivial record that weakens the walkthrough

Open validation item for later phases:
- confirm the exact path from synthetic generation to usable HealthEx FHIR retrieval for the selected patient

### Local workflow assumptions

- Synthea is the primary synthetic-patient source for this exercise.
- For now, keep the Synthea runtime outside this repository and treat it as a local tool dependency.
- Do not commit the Synthea JAR, cloned Synthea repo, or generated output bundles into this repo.
- Generated files may be written to `tmp/synthea-output/` inside this repo during evaluation; that path is gitignored.

### Prerequisites

- the project Conda environment, which now includes `openjdk=21`
- either the Synthea binary JAR (`synthea-with-dependencies.jar`) or a local clone of the Synthea repo

### Recommended local generation flow

1. Download the Synthea JAR or clone the Synthea repo outside this repository.
2. Create a local output directory for generated records:

```bash
mkdir -p /absolute/path/to/HealthEx_TSE_Exercise/tmp/synthea-output
```

3. Generate a first exploratory batch of FHIR bundles:

```bash
java -jar synthea-with-dependencies.jar \
  -p 10 \
  -s 21 \
  --exporter.fhir.export=true \
  --exporter.baseDirectory="/absolute/path/to/HealthEx_TSE_Exercise/tmp/synthea-output"
```

4. Review the exported FHIR bundles in `tmp/synthea-output/fhir/`.
5. Shortlist the strongest candidate patients for the demo and record the seed plus command used to generate them.

If using a cloned Synthea repo instead of the JAR, the equivalent command shape is:

```bash
./run_synthea -p 10 -s 21 --exporter.fhir.export=true \
  --exporter.baseDirectory="/absolute/path/to/HealthEx_TSE_Exercise/tmp/synthea-output"
```

### Suggested curation loop

Start broad, then narrow:

1. Run a small batch such as `-p 10` with a fixed seed.
2. Inspect each exported bundle for resource richness.
3. If the batch is weak, rerun with a different seed and optionally narrow the age range.
4. Keep iterating until about 5 strong patient records are shortlisted.
5. Pick 1 primary demo patient and 1 backup patient before Phase 2 query work begins.

Example narrowing pass:

```bash
java -jar synthea-with-dependencies.jar \
  -p 10 \
  -s 84 \
  -a 18-65 \
  --exporter.fhir.export=true \
  --exporter.baseDirectory="/absolute/path/to/HealthEx_TSE_Exercise/tmp/synthea-output"
```

### What makes a strong candidate patient

Prefer records that have:
- clear demographics and a readable age range for the demo
- at least two of the required UI resource families populated
- visible Conditions, Observations, Medications, or Immunizations
- enough immunization history to support later gap-analysis work
- no obviously sparse or confusing record that would weaken the walkthrough

### What to record in repo memory

When a good patient batch is found, record:
- the exact command used
- the seed value
- any age or geography filters used
- the shortlisted patient bundle filenames or identifiers
- why the selected patient is strong for the demo

### Current boundary

This workflow documents how to generate and curate synthetic FHIR bundles locally.
It does not yet prove the final HealthEx-specific ingestion or retrieval path for those patients.

### Initial batch findings

We ran two exploratory batches locally:

1. `seed=21`, `-p 10`, default age range
2. `seed=84`, `-p 10`, `-a 18-65`

Key takeaway:
- age filtering mattered more than the seed value for demo usefulness
- fixing the seed is still valuable, but mainly for reproducibility once a good batch is found

Observed guidance from these runs:
- use `-p 10` for exploration because it is fast enough to iterate on
- use `-a 18-65` when we want adult demo candidates for the immunization workflow
- treat `-s` as a batch identifier, not a quality knob
- avoid very sparse records and also avoid extremely large outlier bundles that may clutter the UI

Provisional shortlist criteria based on actual output:
- age roughly 25-55 unless we intentionally want a pediatric example
- `Immunization >= 8`
- `Condition >= 15`
- `Observation >= 50`
- `MedicationRequest >= 4`
- total bundle size large enough to be interesting, but preferably not a giant outlier

Provisional strong candidates:
- `Louis204_Dietrich576_b9ef6c40-d234-adb6-b44b-45d664d33cd3.json` from `seed=84`, age `48`
- `Tommie457_Nicolas769_77cef4e0-0882-1b31-79cf-bde102cb4f1c.json` from `seed=84`, age `44`
- `Johnie961_Diane211_Hintz995_b97cfa0c-5a8d-d3eb-3ad0-1aee58d1e14a.json` from `seed=84`, age `44`
- `Betty470_Tuyet839_Denesik803_0e8d654a-4365-3bbb-6065-111b9c240c54.json` from `seed=84`, age `33`
- `Demarcus108_Herzog843_ee6bc21b-5a6c-5abc-1db3-72f2662285a8.json` from `seed=21`, age `34`

Provisional avoid list:
- extremely young patients if we want an adult immunization story
- extreme bundle outliers such as `Gale827_Welch179_52eebba2-0cfa-84c1-c457-c651e1ec25f7.json`, which may be too noisy for the initial UI

### Tuned temp settings used for final selection

The local temp Synthea repo was tuned with:
- `exporter.years_of_history = 0`
- `generate.append_numbers_to_person_names = false`

These settings improved demo quality by:
- preserving full immunization history
- making patient names cleaner and less obviously synthetic in the exported files

### Current demo-ready patient set

We packaged a 10-patient demo set at:
- `tmp/synthea-output/demo-ready-10/`

Manifest files:
- `tmp/synthea-output/demo-ready-10/manifest.md`
- `tmp/synthea-output/demo-ready-10/manifest.json`

Selected patients:
- `Lawana_Kayleen_Johns_bba7bba7-a4c9-85d9-4f24-23d8fdd47b6d.json`
- `Louis_Dietrich_b9ef6c40-d234-adb6-b44b-45d664d33cd3.json`
- `Mickie_O'Hara_14355d02-e933-ade9-9ae0-395e7a640ddb.json`
- `Violet_Thuy_Hoeger_85679f04-bfbf-b482-a0aa-9c88c8294a7f.json`
- `Corliss_Andria_Rodriguez_097ecc89-053b-2351-1a9e-5d42c54d3390.json`
- `Nicolle_Sporer_80f327da-d7b3-c82f-f79e-1cc32f463920.json`
- `Earle_Abshire_d9372509-19a6-5a4c-f3c8-8cfc1ccac743.json`
- `Kelvin_Satterfield_721997bd-a176-ddf3-3353-a8d42fdce168.json`
- `Danilo_Williamson_ed371d80-d2d4-2eb0-1fae-58fea93d4c4c.json`
- `Tommie_Nicolas_77cef4e0-0882-1b31-79cf-bde102cb4f1c.json`

Recommended primary patient for the first UI build:
- `Louis_Dietrich_b9ef6c40-d234-adb6-b44b-45d664d33cd3.json`

Recommended backups:
- `Lawana_Kayleen_Johns_bba7bba7-a4c9-85d9-4f24-23d8fdd47b6d.json`
- `Violet_Thuy_Hoeger_85679f04-bfbf-b482-a0aa-9c88c8294a7f.json`

### Phase 1 closeout handoff

The next phase should start from the selected patient set above rather than rerunning broad Synthea exploration.

Recommended continuity:
- the same agent who investigates the HealthEx APIs should carry the first implementation pass for those APIs
- Phase 2 should begin by validating whether `Louis_Dietrich_b9ef6c40-d234-adb6-b44b-45d664d33cd3.json` can be represented through the HealthEx workflow, with the listed backups available if not
- if the HealthEx workflow cannot use the local synthetic patient path directly, Phase 2 should document the fallback path explicitly before building shaping logic

## Expected Repo Structure

Phase 1 should create only the minimum structure needed for downstream work.

Expected top-level areas:
- `src/app/` for the Next.js App Router application
- `docs/` for phase docs and deeper technical notes
- `scripts/` if helper tooling is needed for Synthea or data inspection
- root config and env example files only as needed

Current scaffold created in Phase 1:
- `package.json` with `dev`, `build`, `start`, and `lint` scripts
- `src/app/layout.tsx` and `src/app/page.tsx` as the initial App Router shell
- `src/app/globals.css` for minimal global styling
- `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, and `eslint.config.mjs`

## Setup Expectations

Phase 1 should document:
- Conda as the shared local environment bootstrap
- Node.js package manager choice
- required environment variables for HealthEx FHIR access
- any future MCP-related setup assumptions we already know
- how to run the app locally once scaffolding exists
- how to run any Synthea helper workflow if it is added to the repo

Current setup decisions:
- use `environment.yml` with `python=3.11` and `nodejs=22`
- use `.env.example` as the starting point for local environment variables
- keep both `HEALTHEX_FHIR_BASE_URL` and `NEXT_PUBLIC_FHIR_BASE_URL` available until we finalize server-only versus client-visible fetching

Default bootstrap flow:

```bash
conda env create -f environment.yml
conda activate healthex-tse
npm install
npm run dev
```

Notes:
- this is the standard setup flow future agents should expect
- `.env.example` should be copied to `.env` when HealthEx integration values are needed
- the app scaffold now exists and `npm run build` and `npm run lint` have been validated successfully
- in the Cursor shell, validate with the active Conda Node toolchain if the default shell path still points at Cursor's bundled runtime

## Handoff To Phase 2

Phase 2 should be able to start with no ambiguity about:
- which stack to build in
- where application code belongs
- whether Python is part of the shipped app
- how synthetic patients are being generated
- what a strong candidate patient looks like
- which HealthEx access assumptions still need validation
- which local patient bundle should be treated as the primary demo candidate

## Immediate Checklist

- [x] Lock the stack to Next.js + TypeScript
- [x] Lock Python to a support-tool role only
- [x] Lock Synthea as the primary patient strategy
- [x] Scaffold the initial application structure
- [x] Define environment variables and setup instructions
- [x] Document the Synthea execution flow in runnable detail
- [x] Hand off HealthEx workflow validation to Phase 2 with a recommended primary patient and backups
