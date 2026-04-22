# Immunization Gap Analysis Skill

This folder contains the source package for the public self-install Claude skill
released as `immunization-gap-analysis v1.1.0`.

## Folder Contents

- `SKILL.md`: trigger metadata and core workflow instructions
- `CHANGELOG.md`: version history for public releases
- `scripts/parse_tabular.py`: parser for the HealthEx dictionary-compressed
  tabular format used by `get_immunizations` and other `get_*` tools
- `scripts/paginate.py`: helper for extracting the next HealthEx pagination call
  and merging paginated windows
- `scripts/normalize_immunizations.py`: canonical immunization normalizer keyed
  by CVX and occurrence date
- `scripts/parse_summary.py`: parser for the flat `get_health_summary` blob
- `scripts/parse_flat_fhir.py`: parser for `search` and
  `search_clinical_notes` flattened-FHIR output
- `scripts/compare_schedule.py`: portable comparison helper against bundled
  schedule snapshots
- `scripts/format_output.py`: output formatter for the public answer contract
- `scripts/parse_titers.py`: parser for immunity-related lab rows
- `scripts/run_analysis.py`: one-call orchestrator for parse, normalize,
  compare, and format
- `references/cdc-acip-scope.md`: recommendation-source hierarchy and schedule
  selection guidance
- `references/cdc_adult_schedule.json`: bundled CDC adult schedule snapshot
- `references/cdc_child_schedule.json`: bundled CDC child and adolescent
  schedule snapshot
- `references/ecdc_schedule.json`: bundled ECDC routing snapshot for Europe-aware
  requests
- `references/cvx_codes.json`: machine-readable CVX mapping used by the scripts
- `references/cvx-antigen-groups.md`: CVX-to-antigen grouping guidance
- `references/data-quality-flags.md`: freshness and record-quality rules
- `references/output-contract.md`: required response structure and confidence
  language
- `references/titers-and-supporting-context.md`: lab/titer and supporting
  context guidance
- `references/limitations-and-disclaimer.md`: safety, uncertainty, and
  disclaimer guidance
- `TESTING.md`: live prompt matrix, issue-triage loop, and local smoke-test
  guide
- `tests/fixtures/`: regression fixtures for the most recent feedback-driven
  fixes

## Reviewer Notes

The skill is designed to sit on top of the HealthEx connector rather than the
browser-token FHIR fetch flow used by the local web UI.

That means:

- the web app and the skill use related patient data concepts
- the skill still requires the user to connect HealthEx and allow tool access in
  Claude before it can analyze the record
- the skill should pause and ask for HealthEx access instead of guessing
  immunization status from incomplete context
- the skill now assumes a full paginated immunization pull, freshness check, and
  CVX-based normalization before making confident schedule claims
- titer-aware answers should pull `get_labs` when immunity or proof-of-immunity
  questions are in scope
- the package now supports a one-call runtime path through
  `scripts/run_analysis.py` so the LLM does not need to chain multiple script
  invocations in sequence

## Data Quality Gaps Handled In The Pipeline

The packaged scripts defensively handle the same HealthEx API-side ambiguities
the web app documents in its `Data Quality Findings` section. A reviewer can
skim these to understand the production-grade posture the skill takes even when
the live record is sparse or noisy.

### Gap A — "No known allergy" sentinels

The skill does not read allergies from `AllergyIntolerance` as if every record
is a real finding. When titer or allergy context matters (for example for
egg-allergy + flu-vaccine interactions), the workflow in `SKILL.md` points at
`get_allergies` with the explicit note that sentinel records and import
artifacts should be treated as the absence of a positive finding, not an
active diagnosis. See `references/data-quality-flags.md` for the broader set of
weaker-evidence flags that lower our confidence.

### Gap B — Identity fan-out through the HealthEx connector

The skill talks to `HealthEx:*` connector tools that already return data
scoped to the authenticated user. Inside the skill's reasoning, we treat the
HealthEx connector as the canonical identity surface and never try to filter
by a single FHIR `Patient/{id}`. This mirrors the web app's Gap B handling:
records are retained across whatever identities HealthEx merges under the
current user.

### Gap C — CVX-first immunization normalization

`scripts/normalize_immunizations.py` keys every immunization record off the
canonical `CVX` code, not the free-text `Immunization` label that HealthEx
returns. Dose-label drift (`"Tdap"` vs `"Tdap #2"` vs `"Tdap Adacel"`) no
longer inflates the row count or misleads the gap analysis. Records with a
missing or unsupported CVX fall through into an `unclassified` bucket rather
than being forced into a schedule.

See `TESTING.md` for the live prompt matrix and the local fixture smoke tests
under `tests/fixtures/` that guard these behaviors, and
`references/data-quality-flags.md` for the full flag catalog.

## Public Package Name

The public-facing skill name is `immunization-gap-analysis`.

The source folder in this repo remains under `claude-skills/`, but the release
ZIP is packaged so Claude sees a top-level folder named
`immunization-gap-analysis`.

## Upload Notes

To upload this as a custom skill:

1. download the release ZIP from `releases/immunization-gap-analysis-v1.1.0.zip`
2. upload the ZIP in Claude under `Customize -> Skills -> + Create skill`
3. make sure the ZIP unpacks to a folder named `immunization-gap-analysis/`
   containing `SKILL.md`, not a loose `SKILL.md` at the ZIP root

If you package it manually, zip the folder itself as the root install unit.
