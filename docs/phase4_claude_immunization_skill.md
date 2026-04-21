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

## Current Package Shape

The current skill package lives at:

- `claude-skills/healthex-immunization-gap/SKILL.md`
- `claude-skills/healthex-immunization-gap/references/cdc-acip-scope.md`
- `claude-skills/healthex-immunization-gap/references/output-contract.md`
- `claude-skills/healthex-immunization-gap/references/limitations-and-disclaimer.md`
- `claude-skills/healthex-immunization-gap/README.md`

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
2. ask the user to connect HealthEx if connector access is unavailable
3. retrieve immunization-relevant longitudinal history
4. choose the CDC age-band schedule path
5. compare the available record to CDC/ACIP guidance
6. return likely current items, potential gaps, corrective actions,
   assumptions, and a non-clinical disclaimer

## Current Limitations

- the local web app's validated browser-token FHIR flow is not the same thing as
  validated live HealthEx connector behavior inside Claude
- the skill package is written to require HealthEx connector access, but the
  exact live MCP tool sequence still needs end-to-end confirmation
- incomplete outside vaccination history can materially change the analysis, so
  the skill must lower confidence when the record is sparse or ambiguous

## Expected Outputs

- a chosen recommendation source
- comparison rules for gap detection and corrective scheduling
- a documented Claude skill workflow using the HealthEx MCP server
- a clear statement of limitations and non-clinical disclaimers
- an uploadable skill folder that a reviewer can inspect directly
