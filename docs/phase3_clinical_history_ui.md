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
- the current live hydrated state already shows strong `Immunization` and `MedicationRequest` sections

## Status

Phase 3 is complete for the current repository state.

The UI now:
- treats the live browser pull as the primary reviewer path
- keeps the local snapshot visible only as fallback context
- uses a streamed chart summary at the top after successful live bundle loads
- places the streamed summary directly above the review workspace instead of separating it with extra framing
- uses compact tabs as the primary clinical navigation model (Conditions, Medications, Labs, Vitals, Immunizations)
- drops standalone Documents and Allergies tabs so the reviewer view stays on strong, reviewer-facing domains
- renders each tab as a single flat list of items rather than nested cards, removing repeated domain headers
- places a single search input at the top of each tab so reviewers can filter items in that tab directly
- lets individual items expand inline to reveal history: a numeric sparkline with min/max/avg for vitals and labs, or a date timeline for events like immunizations, medications, and conditions
- keeps document-heavy and attachment-heavy content out of the reviewer surface (available as source context, not as a tab)
- keeps the visual system smaller, calmer, and less dramatic than the earlier hero-style layout
- collapses the source/fetch controls into a minimal top bar that can be expanded on demand instead of a dedicated card
- uses non-technical empty and partial-state language

## Verified Against Live Data

The chart polish + classification pass was walked through end-to-end against a live patient bundle in the in-IDE browser:

- Blood Pressure chart renders ticks `127 / 103.5 / 80` with a single `mmHg` caption, no clipping, and no value list beneath the chart; Pulse, Respirations, Temperature, Weight, and Height charts render the same way with their prettified units (`/min`, `°C`, `kg`, `cm`).
- Vitals tab now contains SpO2, Blood Pressure, Pulse, Respirations, Temperature, Weight, and Height only; narrative observations and mis-categorized labs no longer appear here.
- Labs tab contains eGFR again and drops narrative observations like `Clinical Information`, `Significant / Alcohol / Drug / Tobacco / Family History`, and `BUN/Creatinine Ratio`.
- Immunization grouping collapses dose variants into single rows (DTaP 9 doses, HepB 3 doses, IPV 4 doses, etc.) and displays the clean non-numeric variant when one is present; live bundle renders as ~27 rows over 59 resources.
- Medication dedupe collapses same-label + same-day + same-status orders into one row (Medications count drops from 33 raw rows to 30 grouped rows) while keeping status-different duplicates separate.
- The Next.js dev overlay no longer flags the Cursor MCP-injected `data-cursor-ref` attributes thanks to `suppressHydrationWarning` on the root `<html>` / `<body>`.

## Focus Areas

- tighten the visual hierarchy of the summary sections
- elevate `Immunization` and `MedicationRequest` as the strongest currently observed reviewer-facing sections
- decide how much of the document-heavy bundle should be exposed in the first reviewer view
- keep the empty-state language non-technical

## Implementation Notes

- `src/components/live-healthex-viewer.tsx` renders a flat, searchable list per tab and drops the nested card structure. Each item expands inline to show its own small timeline.
- The top "Source" strip is a compact one-line control with a secondary "Configure source" toggle that reveals the token + Person ID fields on demand.
- `src/app/api/chart-summary/route.ts` streams the AI summary server-side so the OpenAI key stays out of the browser.
- `src/lib/healthex-summary.ts` now exposes `ClinicalTab.items` directly (no card layer) and stores a full `occurrences` list per item with optional numeric value + unit so the UI can render sparklines for vitals and labs without rehydrating raw resources.
- Narrative/documentation observations (Disclaimer, Gross Description, Comment, Color, Impression, and any text-only observation whose `valueString` runs long) are filtered at shaping time so Labs and Vitals stay focused on real clinical results.
- Occurrences now carry an `isPlaceholder` flag so the UI can tell apart real numeric/text values from `Result available` fallbacks (e.g. Blood Pressure with component-only values); placeholder rollups also drop the `Latest result: Result available` line from their collapsed summary.
- `Observation` and `Immunization` still roll up by label/vaccine so repeated tests and vaccines stay readable at reviewer scale, and each rollup now carries the underlying occurrences for in-place expansion.
- Document references and allergies are no longer surfaced as reviewer tabs. Documents are still counted in notes; allergies may come back as a flag if the live bundle ever returns meaningful allergy data.
- `src/app/globals.css` now carries a lower-chrome tabbed review layout, a single-line source bar, and a flat per-item row style with inline sparkline / date-timeline, placeholder-demoted occurrence styling, and a compact single-value expansion.
- Chart polish + classification pass: sparkline y-axis labels no longer include the unit (the unit renders once as a small caption so numeric ticks can't clip past the viewBox); the occurrence list is hidden whenever a chart is already showing so numeric series aren't displayed twice; `Observation.category` is threaded through `ClinicalOccurrence` so vital-vs-lab classification prefers the FHIR category (`vital-signs` / `laboratory`) and falls back to a tightened label keyword list and a strict unit allow-list (no more single-letter or loose `/min` matches); UCUM codes are prettified (`mm[Hg]` -> `mmHg`, `Cel` -> `°C`, `[in_i]` -> `in`); narrative filter now blocks `Clinical Information`, `Significant Clinical History`, `Alcohol/Drug/Tobacco/Social/Family History`, `BUN/Creatinine Ratio`, and any short `valueString` matching `SEE NOTE` / `same as` / `Yes` / `No`; immunization dose variants (`DTaP 1..5`, `HepB 1..3`, `IPV`, `MMR`, `Hib`, `PCV7`, `Varicella`, `Hepatitis A1/A2`) collapse under one row via `normalizeVaccineLabel`, with a display-label tie-break that prefers a clean non-numeric variant when one exists (so `DTaP 1..5` shows as `DTaP`) and otherwise keeps the longest original label (so `HepB 1..3` stays as `HepB 3`) — the expanded view becomes an actual dose history either way; same-label + same-day + same-status medication orders collapse into one row with an `N orders` annotation; and `<html>` / `<body>` in `src/app/layout.tsx` set `suppressHydrationWarning` to absorb the `data-cursor-ref` attributes that the Cursor browser MCP injects during in-IDE testing.

## Handoff Notes

- Do not assume all supported FHIR resource types are equally populated.
- Prefer making the strongest data readable rather than rendering every possible field.
- Keep the chart summary short and reviewer-facing; it should orient the reviewer, not replace the structured tabs below.
- Prefer flat, searchable per-tab item lists with inline item-level expansion over nested card-on-card layouts.
- Let the active tab establish context; avoid repeating the same domain name in headers, row labels, and badges.
- Per-tab expansion matrix: Immunizations expand to a dose list only (no chart, no date timeline); Vitals with 2+ numeric points expand to chart + summary metrics only (no values list beneath); Labs with 2+ numeric points expand to chart + summary metrics + values list; items with a single occurrence expand to one compact value row (no timeline, no separate list).
- Treat `Result available` as a placeholder, not a value: drop it from the collapsed summary, and render it in an italic muted tone when it does appear.
- Keep the source/fetch controls collapsed by default so the reviewer view stays the focus.
- Keep narrative/documentation observations out of Labs and Vitals. Extend the narrative filter rather than re-surfacing them as rows when new prose-style observations appear.
- If documents or allergies become a reviewer workflow again, re-introduce them as new tabs rather than resurrecting the old nested card pattern.
