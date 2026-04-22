## Phase 5 Extensions And Validation

## Purpose

Phase 5 ships the validation-and-polish layer for the technical submission:
three real HealthEx API-side data-quality gaps are handled in code, each one is
locked in with a targeted unit test, and a creative AI extension lets reviewers
pin any records across tabs and chat with them in a grounded streaming thread.

## Status

Phase 5 is complete for the current repository state.

## What This Phase Shipped

### 1. Three API-side data-quality gap handlers

All three live in [../src/lib/healthex-summary.ts](../src/lib/healthex-summary.ts)
and expose their cleanup counts through a new `dataQualityFlags` field on
`HealthExSummary`. The flags are deliberately kept as a data-layer contract
(feeding the three unit tests and the opening AI chart summary) rather than as
a dedicated UI ribbon, so the reviewer surface stays focused on the clinical
content.

- **Gap A — Sentinel allergy records.** Suppresses SNOMED `716186003`,
  `409137002`, and `429625007` so a "No known allergy" record does not render
  as an active, confirmed allergy. Sentinel count is tracked on
  `dataQualityFlags.sentinelAllergiesSuppressed` and explained in the section's
  `emptyMessage`.
- **Gap B — Multi-Patient identity reconciliation.** A HealthEx `Person` can
  link to multiple `Patient/{id}` identities, and clinical resources attach to
  any of them. `buildSummaryFromBundle` walks `Person.link` plus every
  `subject.reference` / `patient.reference`, exposes the reconciled identity
  set as `summary.patientIdentities`, and locks in the no-filter contract with
  an inline comment. The opening AI summary and the `record-chat` follow-ups
  both inherit this merged-identity view.
- **Gap C — CVX-first immunization grouping.** `buildImmunizationItems`
  groups by CVX code first and only falls back to label normalization when CVX
  is absent. The CVX code is exposed in the item metadata so reviewers can see
  `CVX 115` inline. Dose-label variants collapsed under a shared CVX are
  tracked on `dataQualityFlags.immunizationsGroupedByCvx`.

### 2. Three production-grade unit tests

Added under [../src/lib/__tests__/healthex-summary.test.ts](../src/lib/__tests__/healthex-summary.test.ts).
Each test uses a minimal FHIR bundle fixture, requires no network or API keys,
and directly proves the corresponding gap is handled.

- **Test 1** — "suppresses SNOMED 716186003 'no known allergy' sentinel records"
- **Test 2** — "retains records attached to any Patient identity linked from the Person"
- **Test 3** — "groups immunizations by CVX across drifting display text"

Run locally with:

```
npm run test
```

`vitest` is the runner; the Next.js + React 19 app compiles clean under
`tsc --noEmit` alongside it.

### 3. Chart-as-chat AI extension

The creative AI extension is the chart summary itself: the opening reviewer
summary is now turn 1 of a conversation, and the reviewer can pin any records
as extra grounded context for follow-up turns.

- The summary card ([../src/components/streaming-chart-summary.tsx](../src/components/streaming-chart-summary.tsx))
  streams the first assistant message from
  [../src/app/api/chart-summary/route.ts](../src/app/api/chart-summary/route.ts),
  then exposes a compose box for follow-ups.
- Follow-up turns stream from
  [../src/app/api/record-chat/route.ts](../src/app/api/record-chat/route.ts)
  with `{ history, selections, userMessage }`. The prompt anchors the model to
  the pinned records (when any) and the prior conversation (always). Guardrail
  lines forbid inventing dates, doses, or diagnoses and reframe output as
  chart observations rather than medical advice.
- Selection is a shared React context in
  [../src/lib/record-selection.ts](../src/lib/record-selection.ts). Every
  clinical tab row is now double-click-to-pin: there is no `+ Chat` button at
  rest, keeping the UI calm. Pinned rows render a subtle orange left accent
  plus a small dot next to the label. A one-line hint above each tab's item
  list (shown only when zero pins are active) tells reviewers about the
  interaction.
- Pins are snapshotted onto each user message at send time, so historical
  turns in the thread keep showing the pin chips they were sent with even if
  the user later edits the current selection.
- Up to 12 pins at a time; the most recent 10 occurrences per pin are sent so
  the token budget stays predictable on large bundles.

The previous floating chat dock was removed in favor of this merged surface,
so the old `record-chat-dock.tsx` no longer exists.

### 4. Documentation sweep

- Top-level [../README.md](../README.md) gained a `Data Quality Findings`
  section, a `Running Tests` section, and a `Select-to-Chat` feature blurb.
- [../claude-skills/healthex-immunization-gap/README.md](../claude-skills/healthex-immunization-gap/README.md)
  gained a `Data Quality Gaps Handled In The Pipeline` section that mirrors
  the three gaps from the skill's perspective.
- [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) was updated to check
  off the relevant Phase 5 master TODOs and record three new resolved
  decisions.

## Files Touched

New:
- `src/lib/__tests__/healthex-summary.test.ts`
- `src/app/api/record-chat/route.ts`
- `src/lib/record-selection.ts`

Edited:
- `src/lib/healthex-summary.ts` (Gaps A/B/C + `dataQualityFlags` + `patientIdentities`)
- `src/components/streaming-chart-summary.tsx` (merged chart summary and chat thread, inline pin chips, follow-up compose)
- `src/components/live-healthex-viewer.tsx` (selection provider, double-click-to-pin, pinned-row accent, zero-pin hint)
- `src/app/globals.css` (pinned-row accent, chat-in-summary thread / pins / compose styles)
- `package.json` (`vitest` devDependency, `test` and `test:watch` scripts)
- `README.md`
- `claude-skills/healthex-immunization-gap/README.md`
- `IMPLEMENTATION_PLAN.md`

Removed:
- `src/components/record-chat-dock.tsx` (floating dock, merged into the chart summary)

## Known Open Items

- The chat extension is intentionally single-purpose: no RAG over the full
  bundle, no persistence across page refreshes, no tool calls. If we keep
  building in this direction the obvious next stretch is a "Compare to CDC"
  button on the Immunizations tab that reuses
  `dataQualityFlags.immunizationsGroupedByCvx` and the bundled schedule JSON
  from the skill package.
- The chat extension assumes `OPENAI_API_KEY` is configured on the server; if
  it is not, the chat card surfaces the upstream 500 inline as an error.
- The full end-to-end live-browser-token verification pass is still a Phase 6
  polish item rather than a Phase 5 blocker.
