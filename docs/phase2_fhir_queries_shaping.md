## Phase 2 FHIR Queries And Shaping

## Purpose

Phase 2 takes the validated access path from Phase 1 and turns it into a stable
summary strategy for the repository owner's real HealthEx record.

This phase owns:
- deciding which supported FHIR resource types should lead the first UI slice
- refining the query and pagination assumptions around `$everything`
- shaping the returned bundle into sectioned summary data
- documenting the current limits of the real record and token flow

## Status

Phase 2 is complete for the current repository state.

The shaping layer now:
- ranks up to two lead supported FHIR sections dynamically from the current bundle
- keeps empty supported sections visible instead of silently dropping them
- calls out when the bundle is document-heavy because `Binary` assets dominate the response
- preserves the browser-side live fetch path as the source of truth for richer pulls

## Continuity Note

The same agent who validated the HealthEx retrieval path should carry the first
shaping pass when possible. The critical context now is not endpoint discovery
alone, but the relationship between the live browser token, the returned bundle
shape, and the UI summary logic.

## Inputs From Phase 1

- stack: `Next.js + TypeScript`
- local environment: `environment.yml` with `python=3.11` and `nodejs=22`
- app scaffold: `src/app`
- live viewer: `src/components/live-healthex-viewer.tsx`
- shared shaping logic: `src/lib/healthex-summary.ts`
- optional local fallback: `tmp/healthex-fhir/`

## Current Audited Snapshot

The latest saved local snapshot under `tmp/healthex-fhir/` contains:
- `50` total resources
- `47` `Binary`
- `1` `Person`
- `1` `Patient`
- `1` `AllergyIntolerance`

For the assignment-supported summary types, the current saved snapshot contains:
- `AllergyIntolerance`: `1`
- `Observation`: `0`
- `MedicationRequest`: `0`
- `Condition`: `0`
- `Immunization`: `0`
- `DocumentReference`: `0`

This means the saved snapshot is currently document-heavy and only validates one
clearly usable structured lead section: `AllergyIntolerance`.

## Endpoint Findings

### FHIR REST shape

- base URL: `https://api.healthex.io/FHIR/R4`
- primary retrieval pattern: `GET /Person/{personId}/$everything`
- auth: a short-lived bearer JWT works in the browser context
- response shape: FHIR `Bundle` with resources in `entry[].resource`
- paging: use `_count` and follow `Bundle.link` entries with `relation = next`
- filtering: `_type` is documented, but the real record still needs more validation by resource family

Important detail:

- the JWT `sub` works as the `Person` ID
- the returned `Person` resource may still link to a separate `Patient/{id}` reference
- the shaping layer should continue to treat `personId` as the primary lookup handle

### Auth findings

- copied patient tokens work in browser-side fetches from the current live viewer
- the same copied token currently returns `403` from terminal and server-side requests in this repo
- this means browser-side live fetch is the primary working path for Phase 2

### MCP findings

- the MCP server still lives at `https://api.healthex.io/mcp`
- Phase 2 should document MCP implications, but shaping work should stay focused on the live FHIR bundle first

## Locked Phase 2 Output

The repository now treats section ranking as a data problem, not a hardcoded UI
decision:

- the shared shaping layer computes supported-type counts from the current bundle
- up to two populated types are promoted as lead sections automatically
- lead sections sort first
- populated but non-lead sections remain visible as supporting sections
- empty sections remain present with explicit empty-state or limitation language

Current lead-section result from the saved snapshot:
- validated lead section: `AllergyIntolerance`
- second lead slot: intentionally left open until a fuller live browser pull returns another supported structured type

This is the most accurate closeout for Phase 2 because the current saved bundle
does not honestly justify locking a second validated structured lead section yet.

## Query Assumptions To Carry Forward

1. Discovery query
   - `GET /FHIR/R4/Person/{personId}/$everything?_count=200`
2. Pagination
   - follow `Bundle.link` entries with `relation = next`
3. Resource-family follow-ups as needed
   - `GET /FHIR/R4/Person/{personId}/$everything?_type=Condition,MedicationRequest,AllergyIntolerance,Observation,DocumentReference`
4. Immunization-specific validation
   - `GET /FHIR/R4/Person/{personId}/$everything?_type=Immunization`

Current caveat:
- `_type=Immunization` has already returned `403` in one current workflow, so
  immunization availability remains an open validation item rather than a locked assumption

## Required Outputs For Phase 2

- documented live HealthEx access path for the personal record
- exact query and pagination assumptions for the current patient
- a stable sectioned summary shape for the strongest resource types currently returned
- notes on which resource types are sparse, blocked, or still document-heavy
- updated plan and README notes reflecting the real patient workflow

## Remaining Limits

- the saved local snapshot is still heavily skewed toward `Binary` assets
- a fresh live pull is still needed to confirm the second strongest supported structured section
- some required FHIR resource types may still be absent even in the richer live record
- copied patient tokens still expire quickly and cannot currently drive server-side fetches in this repo

## Handoff To Phase 3

Phase 3 should not revisit bundle parsing unless a new live pull changes the
resource mix materially.

Phase 3 should focus on:
- visual hierarchy for the current lead section(s)
- reviewer-facing readability improvements
- better presentation of document-heavy limitations without changing the Phase 2 shaping contract
