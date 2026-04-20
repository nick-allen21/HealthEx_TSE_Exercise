## Phase 2 FHIR Queries And Shaping

## Purpose

Phase 2 takes the output of Phase 1 and turns it into an actual HealthEx data access plan.

This phase owns:
- investigating the HealthEx FHIR API path for the selected demo patients
- confirming the HealthEx MCP access path needed later for the Claude skill
- deciding the first FHIR resource types to shape for the UI
- defining the exact queries and normalization approach for the primary patient

## Continuity Note

The same agent who investigates the HealthEx APIs should carry the first implementation pass for those APIs when possible.

The reason is simple: Phase 2 is not just about discovering endpoints, but about turning that discovery directly into working retrieval and shaping logic.

## Inputs From Phase 1

- stack: `Next.js + TypeScript`
- local environment: `environment.yml` with `python=3.11`, `nodejs=22`, and `openjdk=21`
- app scaffold: `src/app`
- Synthea workflow: documented in `docs/phase1_foundation.md`
- committed demo-ready patient set: `data/patients/`

Recommended patient order:
1. Primary: `Louis_Dietrich_b9ef6c40-d234-adb6-b44b-45d664d33cd3.json`
2. Backup: `Lawana_Kayleen_Johns_bba7bba7-a4c9-85d9-4f24-23d8fdd47b6d.json`
3. Backup: `Violet_Thuy_Hoeger_85679f04-bfbf-b482-a0aa-9c88c8294a7f.json`

## Immediate Phase 2 Questions

1. Can the selected synthetic patient be created, imported, or otherwise represented in the HealthEx workflow required by the assignment?
2. If not, what is the closest acceptable fallback path: HealthEx test patient, documented test ID, or HealthEx-supported synthetic creation?
3. What exact HealthEx FHIR queries are needed for the primary patient?
4. Which two required resource types should lead the first UI slice?
5. What data-shaping boundary belongs in the client versus lightweight server utilities?

## Recommended Phase 2 Sequence

1. Validate HealthEx FHIR access for the primary selected patient path.
2. Validate HealthEx MCP access assumptions needed for later Claude work.
3. Choose the first two UI resource types based on the actual accessible patient data.
4. Document the exact FHIR queries.
5. Implement retrieval and shaping for the primary patient.
6. Verify the same logic degrades reasonably across the rest of the 10-patient demo set.

## Suggested Resource-Type Priorities

Best starting candidates for the first UI pass:
- `Condition`
- `MedicationRequest`
- `Observation`

Suggested approach:
- lead with `Condition` and `MedicationRequest` if the goal is immediate readability
- pull in `Observation` next if the raw data is rich enough to support a strong summary section
- keep `Immunization` visible even if it is not one of the first two primary sections

## Required Outputs For Phase 2

- documented HealthEx access path for the selected patient
- exact query list for the primary patient
- selected primary and backup patient IDs or retrieval handles in the HealthEx system
- first retrieval/shaping implementation for the chosen resource types
- updated plan and README notes reflecting the real data access path

## Risks To Resolve Early

- the local Synthea shortlist may not map directly into the HealthEx workflow
- the best local synthetic patient may not be the best patient once HealthEx retrieval constraints are applied
- the accessible HealthEx data may change which resource types should lead the UI
