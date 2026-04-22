# HealthEx Technical Implementation Plan

This document is the living technical source of truth for the technical portion
of the HealthEx exercise. It should reflect the current implementation path, the
current patient-source strategy, and the assumptions future agents need in order
to continue without rediscovering context.

## Current Scope

This plan covers the technical component of the exercise only.

Out of scope for now:
- Part 2 written deliverables
- presentation prep beyond technical demo readiness
- speculative infrastructure that does not help the current demo path

## Assignment Summary

The technical assignment requires us to:
- build a simple Web UI that presents a patient's clinical history in a readable way
- fetch data from the HealthEx FHIR R4 server
- display at least two allowed FHIR resource types in structured form
- build a Claude skill that uses the HealthEx MCP server
- detect immunization gaps across the patient's history
- compare immunization history against an accredited recommendation source
- propose a corrective schedule of actions

Primary source: `HealthEx_TSE_Exercise.md`

## Patient Source Strategy

The repo has fully pivoted to a single active patient-source strategy:
- use the repository owner's own HealthEx record
- authenticate through the short-lived patient token exposed in the browser session
- derive the `Person` ID from the JWT `sub`
- fetch the FHIR bundle from `GET /FHIR/R4/Person/{personId}/$everything`

Historical note:
- the repo initially explored a Synthea-based workflow, but that path is no
  longer active guidance and should not drive implementation decisions

## Requirements Checklist

### Must-haves

- [x] Fetch a patient record from the HealthEx FHIR server
- [x] Choose and document the patient source strategy
- [x] Retrieve at least two allowed FHIR resource types in a stable way
- [x] Transform the data into a readable health summary
- [x] Avoid showing raw JSON as the main user experience
- [x] Build a working Web UI for the clinical history view
- [x] Build a Claude skill that uses the HealthEx MCP server
- [x] Evaluate immunization history across all time
- [x] Compare immunization history against an accredited schedule source
- [x] Produce a corrective action plan for missing or overdue immunizations
- [x] Write setup and run instructions in `README.md`
- [x] Document key tradeoffs and what we would do with more time

### Committed extension goals

We still intend to complete the stretch items from the brief if they materially
improve the submission.

- [x] Surface at least one data quality or completeness issue and explain how it should be handled in production
- [x] Add a focused unit test or two for the most critical logic
- [x] Add at least one creative AI skill extension or experiment that materially improves the demo

## Validated Findings

These are no longer assumptions; they have already been validated in the current
implementation work.

- The HealthEx FHIR base URL is `https://api.healthex.io/FHIR/R4/`.
- The HealthEx patient browser token can be read from `container.authManager.token`
  inside `app.healthex.io`.
- The JWT `sub` works as the `Person` ID for `GET /FHIR/R4/Person/{sub}/$everything`.
- Browser-side requests using the live patient token succeed for the FHIR `$everything` call.
- The same copied patient token currently returns `403` from terminal and
  server-side requests in this repository.
- The app therefore uses browser-side live fetch as the primary retrieval path.
- The repo also supports a local snapshot fallback from `tmp/healthex-fhir/`
  when a bundle has already been saved.

## Planned Technical Deliverables

- A technical implementation in this repository
- A Web UI that presents a patient health summary in a simple reviewer-friendly layout
- A clear data flow from HealthEx FHIR data into normalized UI sections
- An uploadable Claude skill package and usage pattern for immunization-gap analysis
- A documented recommendation source and comparison approach
- A concise evaluator-facing `README.md`
- Six phase docs in `docs/` for execution notes and handoff context

## Phase Document Status

Current phase-doc status:

- `docs/phase1_foundation.md`: rewritten to cover HealthEx access and retrieval foundation
- `docs/phase2_fhir_queries_shaping.md`: active shaping and summary-section handoff
- `docs/phase3_clinical_history_ui.md`: completed reviewer-facing chart shell, fallback decisions, grouped-summary presentation, streaming summary direction, final compact single-column review cleanup, per-section search / in-card expansion pass, the flat-tab restructure that drops Documents and Allergies, exposes a per-tab search input, and adds inline item-level sparkline / date-timeline expansion, and the chart polish + classification pass (non-clipping y-axis with a single unit caption, no value list under a chart, category-first vital/lab classification, UCUM unit prettifier, stronger narrative filter, immunization dose grouping, same-day medication dedupe, and an MCP-injection-safe `suppressHydrationWarning` on the root layout), plus a live-data verification pass and an immunization display-label tie-break that prefers a non-numeric variant when one is available
- `docs/phase4_claude_immunization_skill.md`: active skill-package, recommendation-source, Claude/MCP workflow, and latest live-test handoff
- `docs/phase5_extensions_validation.md`: delivers three HealthEx API-side data-quality gap handlers (sentinel allergies, multi-Patient identity reconciliation, CVX-first immunization grouping), three targeted vitest tests for those handlers, and the chart-as-chat AI extension (opening summary streams as the first turn of a grounded conversation, records are pinned via double-click, and follow-ups stream from `/api/record-chat`)
- `docs/phase6_readme_submission.md`: active reviewer-facing packaging and submission notes

## Architecture Assumptions And Constraints

### Product constraints

- The demo should optimize for clarity over breadth.
- The UI should feel clean and easy to evaluate quickly.
- The assignment is time-boxed, so simple implementation paths should win.
- The solution must still clearly demonstrate both FHIR handling and AI-assisted reasoning.

### Data constraints

- Data must come from `https://api.healthex.io/FHIR/R4/`.
- The displayed summary must use at least two of these resource types:
  - `Observation`
  - `MedicationRequest`
  - `Condition`
  - `AllergyIntolerance`
  - `Immunization`
  - `DocumentReference`
- Immunization analysis depends on the completeness and accuracy of the retrieved patient record.

### Delivery constraints

- The repo should remain understandable to a reviewer opening it for the first time.
- The plan should stay lightweight enough that agents can actually keep it updated.
- Each tracked file should have a clear purpose in the current personal-record workflow.

## Decision Log

### Resolved Decisions

| Topic | Current decision | Reason |
|---|---|---|
| Repository source of truth | `IMPLEMENTATION_PLAN.md` is the living technical source of truth | Keeps project memory in one place |
| Human entry point | `README.md` is evaluator-facing | Matches the exercise submission context |
| Phase docs | We will maintain six phase docs in `docs/` as the handoff surface for future work | Keeps multi-agent context explicit |
| Technical stack | Next.js + TypeScript is the main application stack | Aligns with HealthEx's TypeScript usage and keeps the app simple |
| Python role | Python is limited to helper tooling and diagnostics | Keeps the shipped app single-runtime |
| Bootstrap flow | Use the Conda + npm startup sequence documented in `README.md` | Keeps setup predictable in Cursor and local terminals |
| Patient source | Use the repository owner's own HealthEx record only | Removes confusion from synthetic datasets and matches the current validated path |
| Primary retrieval path | Use browser-side `GET /FHIR/R4/Person/{sub}/$everything` with the live patient token | This is the path that has actually been validated end-to-end |
| Local fallback | Keep `tmp/healthex-fhir/` as an optional local snapshot fallback | Helps UI development when a recent bundle already exists |
| Summary shaping | Use shared bundle-to-summary logic for both local and live flows | Keeps the UI behavior consistent |
| Recommendation source | Use `CDC/ACIP` as the clinical source of truth and `CDC CDSi` as the implementation companion | Matches the assignment and keeps the authority hierarchy explicit |
| Claude skill packaging | Ship a real uploadable skill folder under `claude-skills/healthex-immunization-gap/` | Gives reviewers a concrete artifact they can inspect and upload |
| Skill input contract | Expect live HealthEx connector access and ask the user to connect HealthEx if tool access is unavailable | Keeps the skill grounded in record evidence rather than guesswork |
| Skill engine shape | Use a hybrid skill package: strong workflow instructions plus bundled parser/normalizer helper scripts | Matches the HealthEx connector's real output formats and reduces brittle prompt-only parsing |
| Public distribution shape | Keep the source skill in `claude-skills/healthex-immunization-gap/` and ship a release ZIP rooted as `immunization-gap-analysis/` | Preserves repo context while giving public users a clean installable artifact |
| Reliability pass shape | Prefer a single orchestrator script plus fixture-backed smoke tests for the skill runtime | Reduces tool-call overhead and makes feedback-driven iteration safer |
| Sentinel allergy handling | Suppress SNOMED 716186003 / 409137002 / 429625007 in the shaping layer and surface the count on `dataQualityFlags.sentinelAllergiesSuppressed` | Prevents "No known allergy" records from rendering as active, confirmed findings for any consumer of `HealthExSummary` |
| Multi-Patient identity reconciliation | Keep every clinical resource regardless of which Patient identity it was filed under, and expose the reconciled set as `summary.patientIdentities` with a no-filter contract comment in `buildSummaryFromBundle` | HealthEx Person records link to multiple Patient identities; filtering by one ID silently drops half of a real patient record |
| CVX-first immunization grouping | Group Immunization resources by CVX code first, fall back to normalized label only when CVX is absent, and expose the shared CVX on `item.metadata` | Free-text `vaccineCode.text` drifts across doses of the same antigen; grouping by label over-counts distinct vaccines and under-counts doses |
| Chart-as-chat extension shape | Merge the streaming chart summary and the record chat into a single conversational card: the opening `/api/chart-summary` stream is turn 1, follow-ups stream from `/api/record-chat`, and reviewers pin extra context by double-clicking any clinical-review row (pins snapshot onto each user turn). Implemented in `src/components/streaming-chart-summary.tsx`, `src/app/api/record-chat/route.ts`, and `src/lib/record-selection.ts`. | Keeps the AI augmentation scoped, auditable, and useful on real heterogeneous bundles without a separate assistant panel, and avoids cluttering the review surface with an explicit pin button or a floating dock |

### Open Decisions

| Topic | Current options | Notes |
|---|---|---|
| Token automation | Keep manual paste flow for now, or add a browser-side developer bridge later | Manual paste works today; auth automation can wait |
| First emphasized resource types | Lead with whatever two resource types are best populated in the real record | Must satisfy the assignment while staying readable |
| Immunization source quality | Use direct FHIR `Immunization` if available, or document limitations if it remains sparse | Needs validation against the real patient bundle |
| Exact HealthEx MCP flow inside Claude | Keep validating the precise connector/tool sequence and answer-shaping behavior in real Claude runs | The shipped skill now encodes the documented tool flow, but live behavior still needs iteration around output discipline and narrow-question handling |

## Proposed Technical Direction

### Web application

- Favor a lightweight web app with a minimal number of moving parts.
- Use Next.js + TypeScript for the shipped application.
- Structure the UI around readable clinical sections rather than raw resource dumps.
- Prefer grouped summaries for high-volume sections instead of rendering every resource as a first-class row.
- Use a chart-style shell with a short AI summary and tabbed domains for dense patient histories.
- Keep the review surface compact and calm: summary directly above review, low-chrome tabs, and flat per-tab item lists instead of oversized hero framing.
- Let the active tab carry the domain context so repeated domain headers and nested card framing can be dropped.
- Place one search input at the top of each tab and scope it to the items in that tab.
- Expand individual items inline (not sections) to reveal their own history — a numeric sparkline with min/max/average for vitals and labs, and a date timeline for event-style domains.
- Collapse the source/fetch controls into a minimal top bar that can be expanded on demand so the reviewer view stays the focus.
- Keep the browser-side live fetch path available so the app can hydrate from a current patient token.

### Data handling

- Treat the HealthEx `Person` ID as the primary FHIR retrieval handle.
- Use browser-side fetch for the current patient-token path because it is the validated path that works.
- Keep `tmp/healthex-fhir/` as an optional local bundle source for development fallback.
- Normalize the returned bundle into UI-ready sections with shared shaping logic.
- Prefer a narrow, explicit set of supported resource types for the initial build.

### AI component

- Use the HealthEx MCP server through Claude for immunization-gap analysis.
- Make the skill's inputs, assumptions, and recommendation source explicit.
- Keep the analysis grounded in structured patient history when possible.
- Document auth limitations clearly if MCP and FHIR continue to require different working flows.
- Keep the uploadable skill package in `claude-skills/healthex-immunization-gap/`.
- Treat `get_immunizations` as the primary immunization source, `update_and_check_recent_records` as the freshness gate, and `get_labs` as the first extension path for titer-aware questions.
- Bundle machine-readable CDC and ECDC schedule snapshots plus CVX mapping data for public distribution.
- Keep the runtime path compact: one orchestrator call should be preferred over several chained script calls when possible.
- Keep iterating on user-facing answer discipline so the shipped skill consistently returns one clean formatted answer with minimal runtime leakage.

## Master TODOs

### 1. Access and retrieval foundation

- [x] Lock the implementation stack and bootstrap flow
- [x] Validate the browser-side patient-token path
- [x] Confirm that JWT `sub` works as the HealthEx `Person` ID
- [x] Add a live browser-side retrieval flow to the app
- [ ] Decide whether a token-automation bridge is needed for the demo

### 2. FHIR retrieval and shaping

- [ ] Identify the strongest supported resource types in the real patient bundle
- [ ] Build shaping logic that emphasizes at least two required FHIR resource types
- [ ] Improve handling for document-heavy or partially normalized bundle responses
- [ ] Document any data quality or completeness issues found in the live record

### 3. Clinical history Web UI

- [x] Tighten the reviewer-facing UI layout
- [x] Implement readable sections for the strongest supported resource types
- [x] Keep empty and partial states graceful and non-technical
- [x] Decide how prominently to surface local snapshot fallback versus live fetch

### 4. Claude immunization skill

- [x] Choose the accredited immunization recommendation source
- [ ] Validate whether FHIR `Immunization` is complete enough in the real record
- [x] Define the comparison rules we will use
- [x] Document limitations and non-clinical disclaimers needed for the demo
- [ ] Confirm the exact HealthEx MCP workflow required for Claude
- [x] Draft the Claude skill instructions
- [x] Define what context the skill needs as input
- [x] Add HealthEx-format parsing and normalization helpers to the skill package
- [x] Add versioning, changelog, license, and release ZIP packaging for self-install distribution
- [x] Add orchestrated runtime and fixture-backed smoke tests for the skill package
- [x] Validate that the skill can identify gaps and produce a corrective schedule

### 5. Validation and polish

- [x] Identify the most critical logic worth testing
- [x] Add focused tests only where they materially reduce risk
- [x] Surface the three HealthEx API-side data-quality gaps we handle in code (sentinel allergies, multi-Patient identity reconciliation, CVX-first immunization grouping)
- [x] Ship the creative AI extension (chart-as-chat: streaming chart summary becomes turn 1 of a grounded conversation; reviewers double-click rows to pin extra context)
- [ ] Verify the main technical flow end-to-end with the live browser-token path
- [ ] Confirm the UI is readable with real patient data

### 6. Evaluator-facing documentation

- [x] Keep `README.md` current as the implementation changes
- [x] Document setup and run instructions
- [x] Document key tradeoffs
- [x] Document what we would do differently with more time

## Risks And Unknowns

- Copied browser patient tokens are short-lived and inconvenient for repeated manual testing.
- The patient token currently appears to be browser-usable but server-side-forbidden in this repo.
- Some clinically interesting data may arrive as `Binary` or other document-heavy resources rather than clean structured FHIR resources.
- Immunization recommendations can become complex quickly, so we should avoid over-claiming clinical certainty.
- The HealthEx MCP workflow may still require setup details not yet documented in this repo.
- The uploaded skill and the local browser-token FHIR path rely on related but not identical access patterns, so reviewer instructions must keep that distinction clear.
- HealthEx tool outputs are heterogeneous and require parser maintenance if the connector format changes.

## Handoff Notes For Future Phase Agents

- Start by reading this file, `AGENT_README.md`, and the phase document you are responsible for.
- Assume the active patient strategy is the repository owner's own HealthEx record unless a user explicitly changes it.
- Do not revive Synthea or synthetic-demo guidance unless the user explicitly asks for that path again.
- Prefer updating the current browser-live workflow before adding new infrastructure.
