## Phase 3 Clinical History UI

## Purpose

Phase 3 turns the shaped HealthEx bundle into a reviewer-friendly clinical
history view.

This phase should:
- prioritize readability over exhaustiveness
- highlight the strongest supported FHIR sections first
- keep sparse or missing categories understandable instead of confusing

## Current Inputs

- `src/components/live-healthex-viewer.tsx` handles live browser-side fetch
- `src/lib/healthex-summary.ts` shapes the bundle into display sections
- `src/app/page.tsx` already renders both local and live summary states

## Focus Areas

- tighten the visual hierarchy of the summary sections
- elevate the two strongest assignment-relevant FHIR resource types
- decide how much of the document-heavy bundle should be exposed in the first reviewer view
- keep the empty-state language non-technical

## Handoff Notes

- Do not assume all supported FHIR resource types are equally populated.
- Prefer making the strongest data readable rather than rendering every possible field.
