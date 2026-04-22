## Phase 4 Claude Immunization Skill

## Purpose

Phase 4 combines the immunization-gap analysis design and the Claude/MCP
integration work into one phase.

## Focus Areas

- confirm whether `Immunization` is complete enough in the current FHIR response
- choose the accredited recommendation source that anchors the comparison logic
- define comparison rules for age, history, timing, and missing data
- confirm the exact HealthEx MCP flow needed for the current user record
- define the context the Claude skill needs as input
- document the prompt or packaging shape that is easiest for reviewers to follow

## Constraints

- keep the skill grounded in the real patient data that the repo can actually access
- document any mismatch between the MCP path and the browser-token FHIR path
- state limitations and non-clinical disclaimers clearly

## Current Decisions

- `CDC/ACIP` is the clinical recommendation source of truth
- `CDC CDSi` is the implementation companion for evaluation logic, not the
  primary clinical authority cited to the user
- the deliverable shape is a real uploadable Claude skill folder
- the skill assumes HealthEx connector access as its primary input contract
- if HealthEx access is unavailable, the skill should ask the user to connect
  HealthEx and allow tool usage before making immunization-gap claims
- the skill should review all-time immunization history, identify likely gaps,
  and propose corrective actions with explicit cautions when the record is
  incomplete
- the skill should support titer-aware immunity questions by conditionally
  pulling `get_labs`
- the skill should treat `get_immunizations` as the primary source of truth and
  `get_health_summary` as quick context only
- the skill should use `CVX` and `OccurrenceDate` as its core immunization
  comparison fields
- the skill should run a freshness check with
  `update_and_check_recent_records` at entry
- the public-facing skill name is `immunization-gap-analysis` at version `1.0.0`
- the public release artifact is a ZIP rooted as `immunization-gap-analysis/`
  even though the repo source folder remains under `claude-skills/`
- the v1.1 reliability pass should prefer a single orchestrator script over
  multiple separate runtime invocations
- the v1.1 reliability pass should parse titers automatically instead of
  requiring manual lab interpretation

## Current Package Shape

The current skill package lives at:

- `claude-skills/healthex-immunization-gap/SKILL.md`
- `claude-skills/healthex-immunization-gap/scripts/parse_tabular.py`
- `claude-skills/healthex-immunization-gap/scripts/paginate.py`
- `claude-skills/healthex-immunization-gap/scripts/normalize_immunizations.py`
- `claude-skills/healthex-immunization-gap/scripts/parse_summary.py`
- `claude-skills/healthex-immunization-gap/scripts/parse_flat_fhir.py`
- `claude-skills/healthex-immunization-gap/scripts/parse_titers.py`
- `claude-skills/healthex-immunization-gap/scripts/run_analysis.py`
- `claude-skills/healthex-immunization-gap/scripts/compare_schedule.py`
- `claude-skills/healthex-immunization-gap/scripts/format_output.py`
- `claude-skills/healthex-immunization-gap/references/cdc-acip-scope.md`
- `claude-skills/healthex-immunization-gap/references/cdc_adult_schedule.json`
- `claude-skills/healthex-immunization-gap/references/cdc_child_schedule.json`
- `claude-skills/healthex-immunization-gap/references/ecdc_schedule.json`
- `claude-skills/healthex-immunization-gap/references/cvx_codes.json`
- `claude-skills/healthex-immunization-gap/references/cvx-antigen-groups.md`
- `claude-skills/healthex-immunization-gap/references/data-quality-flags.md`
- `claude-skills/healthex-immunization-gap/references/output-contract.md`
- `claude-skills/healthex-immunization-gap/references/titers-and-supporting-context.md`
- `claude-skills/healthex-immunization-gap/references/limitations-and-disclaimer.md`
- `claude-skills/healthex-immunization-gap/CHANGELOG.md`
- `claude-skills/healthex-immunization-gap/README.md`
- `claude-skills/healthex-immunization-gap/TESTING.md`
- `claude-skills/healthex-immunization-gap/tests/fixtures/`
- `releases/immunization-gap-analysis-v1.0.0.zip`

## Trigger And Workflow Direction

The skill is designed to activate when a user asks Claude to:

- review vaccine or immunization history from HealthEx
- identify missing, overdue, or likely due vaccines
- compare HealthEx records to CDC/ACIP guidance
- propose catch-up or corrective vaccine actions
- review preventive-care gaps where immunizations are clearly part of the ask

The skill should not trigger for generic chart summaries with no immunization
focus.

When triggered, the skill should:

1. confirm HealthEx connector access
2. run `update_and_check_recent_records`
3. ask the user to reconnect or note possible staleness when the sync is old
4. retrieve all-time immunization history by paginating `get_immunizations`
5. parse HealthEx's tabular format and normalize the data by `CVX` and
   `OccurrenceDate`
6. choose the CDC age-band schedule path
7. pull `get_labs`, `get_allergies`, `get_conditions`, `get_medications`,
   `get_procedures`, `get_visits`, `search`, or `search_clinical_notes` only
   when the question needs them
8. compare the available record to CDC/ACIP guidance
9. return freshness, data-quality flags, likely current items, potential gaps,
   corrective actions, assumptions, and a non-clinical disclaimer
10. fall back gracefully when tool-call budget prevents a full deep-history run,
    instead of silently pretending the full scripted pipeline completed

## Current Limitations

- the local web app's validated browser-token FHIR flow is not the same thing as
  validated live HealthEx connector behavior inside Claude
- the skill package now encodes the documented connector formats, but the exact
  live MCP tool sequence still needs end-to-end confirmation in Claude
- incomplete outside vaccination history can materially change the analysis, so
  the skill must lower confidence when the record is sparse or ambiguous
- the CDC schedule comparison remains guidance-first rather than a complete
  production forecasting engine
- public-distribution readiness still depends on live validation against
  disconnected, stale, and known-good HealthEx test cases
- adult schedule coverage is improving, but some risk-based or season-specific
  questions still intentionally resolve to `context required`

## Expected Outputs

- a chosen recommendation source
- comparison rules for gap detection and corrective scheduling
- a documented Claude skill workflow using the HealthEx MCP server
- a clear statement of limitations and non-clinical disclaimers
- an uploadable skill folder that a reviewer can inspect directly
