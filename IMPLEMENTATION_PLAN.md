# HealthEx Technical Implementation Plan

This document is the living technical source of truth for the HealthEx exercise repository. Agents should update it as decisions are made, TODOs move forward, and scope changes.

## Current Scope

This plan covers the technical component of the exercise only.

Out of scope for now:
- Part 2 written deliverables
- detailed phase build plans
- presentation prep details beyond technical demo readiness

## Assignment Summary

The technical assignment requires us to:
- build a simple Web UI that presents a patient's clinical history in a readable way
- fetch data from the HealthEx FHIR R4 server
- display at least two allowed FHIR resource types in structured form
- build a Claude skill that uses the HealthEx MCP server
- detect immunization gaps across the patient's history
- compare those gaps against an accredited recommendation source
- propose a corrective schedule of actions

Primary source: `HealthEx_TSE_Exercise.txt`

## Requirements Checklist

### Must-haves

- [ ] Fetch a patient record from the HealthEx FHIR server
- [ ] Choose and document the patient source strategy
- [ ] Retrieve at least two allowed FHIR resource types
- [ ] Transform the data into a readable health summary
- [ ] Avoid showing raw JSON as the main user experience
- [ ] Build a working Web UI for the clinical history view
- [ ] Build a Claude skill that uses the HealthEx MCP server
- [ ] Evaluate immunization history across all time
- [ ] Compare immunization history against an accredited schedule source
- [ ] Produce a corrective action plan for missing or overdue immunizations
- [ ] Write setup and run instructions in `README.md`
- [ ] Document key tradeoffs and what we would do with more time

### Committed extension goals

We intend to complete the stretch items from the exercise brief, even though they are listed as optional there.

- [ ] Surface at least one data quality or completeness issue and explain how it should be handled in production
- [ ] Add a focused unit test or two for the most critical logic
- [ ] Add at least one creative AI skill extension or experiment that materially improves the demo

## Planned Technical Deliverables

- A technical implementation in this repository
- A Web UI that presents a patient health summary in a simple reviewer-friendly layout
- A clear data flow from HealthEx FHIR data into normalized UI sections
- A Claude skill prompt and usage pattern for immunization-gap analysis
- A documented recommendation source and comparison approach
- A concise evaluator-facing `README.md`
- Seven phase docs in `docs/` for workstream-specific execution and handoff notes

## Phase Document Status

Current phase-doc status:

- `docs/phase1_foundation.md`: complete and closed out
- `docs/phase2_fhir_queries_shaping.md`: active handoff for HealthEx API investigation and shaping
- `docs/phase3_clinical_history_ui.md`
- `docs/phase4_immunization_engine.md`
- `docs/phase5_claude_skill.md`
- `docs/phase6_extensions_validation.md`
- `docs/phase7_readme_submission.md`

## Document Rules

- Update this file whenever scope, assumptions, or status changes.
- Add resolved decisions to the decision log instead of leaving them implicit.
- Keep TODOs actionable and grouped by workstream.
- Keep the phase docs aligned with this file as they are defined and expanded.
- Do not treat this document as a detailed phase log; detailed execution notes belong in the assigned phase doc.

## Architecture Assumptions And Constraints

### Product constraints

- The demo should optimize for clarity over breadth.
- The UI should feel clean and easy to evaluate quickly.
- The assignment is time-boxed, so we should prefer simple architecture over maximum completeness.
- The solution must clearly demonstrate both FHIR handling and AI-assisted reasoning.

### Data constraints

- Data must come from `https://api.healthex.io/FHIR/R4/`
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
- The implementation should favor fast demo readiness over speculative infrastructure.

## Decision Log

### Resolved Decisions

| Topic | Current decision | Reason |
|---|---|---|
| Repository source of truth | `IMPLEMENTATION_PLAN.md` is the living technical source of truth | Keeps project memory in one place |
| Human entry point | `README.md` is evaluator-facing | Matches the exercise submission context |
| Phase docs | We will maintain seven named phase docs in `docs/`, one for each implementation workstream | Gives each agent a clear execution and handoff surface |
| Planning model | TODOs are grouped by workstream now, phase build plans later | Lets phase agents derive their own execution plans |
| Agent operating model | Each agent owns one phase and updates shared docs as work progresses | Preserves accountability and continuity |
| Technical stack | Next.js + TypeScript is the main application stack | Aligns with HealthEx's TypeScript usage while keeping the app simple |
| Python role | Python is limited to helper scripts and data tooling | Lets us use Python where convenient without turning the project into a multi-runtime app |
| Local bootstrap flow | Agents should standardize on the Conda + npm startup sequence documented in `README.md` and `docs/phase1_foundation.md` | Keeps environment setup predictable across agents and machines |
| Initial scaffold shape | The app starts as a minimal Next.js App Router scaffold rooted at `src/app` | Gives Phase 2 a clean place to add FHIR retrieval and summary UI work |
| Local Synthea placement | Keep Synthea as an external local tool for now and document the runbook rather than vendoring the generator into this repo | Keeps the repo lightweight while Phase 1 focuses on workflow clarity |
| Synthea runtime dependency | The shared Conda environment should include OpenJDK so Synthea runs without extra machine-specific setup | Keeps the synthetic-data workflow reproducible for future agents |
| Patient strategy | Phase 1 will generate about 5 curated synthetic patients using the Synthea JAR | Gives us realistic structured FHIR data while letting us optimize the demo data we want to show |
| Phase continuity | When API investigation is part of the work, the same agent should carry the first implementation pass when possible | Reduces context loss between discovery and execution |
| Stretch work | We plan to complete all three stretch items from the brief | The extra validation and AI work improves the strength of the submission |

### Open Decisions

| Topic | Current options | Notes |
|---|---|---|
| UI information architecture | Single-page summary, tabbed view, or sectioned dashboard | Must stay simple and reviewer-friendly |
| FHIR normalization approach | Client-side transform only, or lightweight server-side shaping | Prefer the simplest path that keeps the UI clean |
| Immunization schedule source | CDC adult schedule or another accredited equivalent | Must be clearly cited and easy to justify |
| Claude skill packaging | Prompt set, workflow notes, and repo documentation | Need to decide the exact deliverable shape |

## Proposed Technical Direction

These reflect the current technical direction. Some items below are now locked, while others remain open decisions.

### Web application

- Favor a lightweight web app with a minimal number of moving parts.
- Use Next.js + TypeScript for the shipped application.
- Structure the UI around readable clinical sections rather than raw resource dumps.
- Include immunizations in the visible history even if they are also used by the Claude skill.

### Data handling

- Fetch the patient and relevant related resources from the HealthEx FHIR endpoint.
- Generate about 5 synthetic patients with the Synthea JAR in Phase 1 so we have realistic data we can tune for the demo.
- Prefer adult age filtering during exploration when the goal is to support immunization-gap analysis.
- Use Python only for support tooling if it materially helps with patient-data generation or analysis.
- Normalize the returned data into UI-ready sections.
- Prefer a narrow, explicit set of supported resource types for the initial build.

### AI component

- Use the HealthEx MCP server through Claude for immunization-gap analysis.
- Make the skill's inputs, assumptions, and recommendation source explicit.
- Keep the analysis grounded in structured patient immunization history rather than vague summaries.

## Master TODOs

These TODOs are the working backlog for future phase agents.

### 1. Project setup and scaffolding

- [x] Choose the implementation stack and record the decision here
- [x] Set up the initial project structure
- [x] Define environment variables and local setup requirements
- [x] Document the default Conda + npm bootstrap flow for future agents
- [x] Document the local Synthea workflow and output location
- [x] Decide to keep Synthea external to the repo for now
- [x] Close out Phase 1 and hand off HealthEx API investigation to Phase 2
- [x] Establish a simple folder structure for app code, docs, and prompts if needed

### 2. FHIR retrieval and shaping

- [x] Generate and shortlist a demo-ready synthetic patient set with tuned Synthea settings
- [ ] Confirm how the HealthEx FHIR tooling will be accessed during development
- [ ] Confirm how the HealthEx MCP tooling will be accessed during development
- [ ] Confirm how the selected synthetic patient data will flow through the HealthEx FHIR server requirements
- [ ] Document the exact FHIR queries needed for the chosen patient
- [ ] Select the initial resource types to support in the UI
- [ ] Build data-fetching logic for patient and related resources
- [ ] Build a transformation layer that shapes FHIR responses into readable summary data
- [ ] Document any data quality or completeness issues found in the returned record

### 3. Clinical history Web UI

- [ ] Define the reviewer-facing UI layout
- [ ] Implement the patient summary view
- [ ] Implement readable sections for at least two required resource types
- [ ] Add immunization history to the UI if it is not already one of the two primary displayed resource types
- [ ] Handle empty, partial, or missing clinical data gracefully
- [ ] Keep language and labels non-technical where possible

### 4. Immunization-gap analysis design

- [ ] Choose the accredited immunization recommendation source
- [ ] Document the comparison rules we will use
- [ ] Define how age, history, timing, and missing data should affect recommendations
- [ ] Identify what output shape the analysis should produce
- [ ] Document limitations and non-clinical disclaimers needed for the demo

### 5. Claude skill and MCP integration

- [ ] Confirm the exact HealthEx MCP workflow required for Claude
- [ ] Draft the Claude skill instructions
- [ ] Define what context the skill needs as input
- [ ] Implement or document the skill usage flow end-to-end
- [ ] Validate that the skill can identify gaps and produce a corrective schedule
- [ ] Capture any manual steps needed for reviewers or demo walkthroughs

### 6. Validation, extension tasks, and demo polish

- [ ] Identify the most critical logic worth testing
- [ ] Add a small number of focused tests if they reduce real risk
- [ ] Surface at least one data quality or completeness issue and document the production handling approach
- [ ] Add at least one creative AI extension or experiment that materially improves the demo
- [ ] Verify the main technical flow end-to-end
- [ ] Confirm the UI is readable with realistic patient data
- [ ] Prepare a concise demo narrative for the technical walkthrough

### 7. Evaluator-facing documentation

- [ ] Keep `README.md` current as the implementation changes
- [ ] Document setup and run instructions
- [ ] Document key tradeoffs
- [ ] Document what we would do differently with more time
- [ ] Link reviewers to deeper technical docs only where useful

## Risks And Unknowns

- We may discover gaps or inconsistencies in patient immunization history.
- The HealthEx MCP workflow may require setup details not yet documented in this repo.
- The best patient source for the demo may depend on data completeness rather than convenience.
- Immunization recommendations can become complex quickly, so we should avoid over-claiming clinical certainty.
- If the technical stack is changed later, this plan will need a decision update before implementation starts.

## Handoff Notes For Future Phase Agents

- Start by reading this file, `AGENT_README.md`, and your assigned phase document.
- Treat the checklist and TODOs above as the current shared backlog.
- Record new decisions here before making large architecture changes.
- Map your phase work back to the TODOs in this file rather than replacing them.
