---
name: immunization-gap-analysis
description: Analyze the user's full immunization history from HealthEx, compare it against CDC or ECDC guidance, identify likely gaps, and propose a corrective action plan. Use whenever the user mentions vaccines, shots, boosters, being up to date, flu shots, COVID boosters, Tdap, MMR, HPV, titers, immunity, catch-up schedules, travel vaccines, school or employer forms, asks what vaccines they need, or asks when they last got a specific vaccine.
version: 1.1.0
---

# Immunization Gap Analysis

## When To Use

Use this skill whenever the user wants an answer grounded in HealthEx records
about vaccine history, whether they appear up to date, what they may still
need, whether titers or immunity change the picture, when they last received a
specific vaccine, or what next actions they should take. Use it even when the
user does not explicitly ask for a "gap analysis."

## Do Not Use This Skill When

- the user only wants a generic chart summary with no immunization focus
- the request is about medications, labs, diagnoses, or conditions unrelated to
  vaccines
- the request needs a medical diagnosis or individualized clinical judgment that
  cannot be supported by the available record

## Prerequisites This Skill Assumes

- the HealthEx connector is installed and authenticated
- the user has granted data access to HealthEx records
- records have synced recently enough to support record review

## Required Entry Checks

Before any analysis, call `HealthEx:update_and_check_recent_records` and branch:

- If the call fails, respond: `I need the HealthEx connector to be installed and connected to analyze your immunizations. You can connect it at Settings -> Connectors -> HealthEx. Once connected, ask me again.` Do not attempt analysis.
- If `lastUpdated` is more than 30 days old, lead the response with a warning
  that the records may be stale. Surface `reconnectUrl` when available.
- If the call succeeds and data is fresh, proceed and still include the sync
  date in the final output.

## Core HealthEx Facts

- `get_immunizations` is the primary immunization source of truth for this
  skill.
- `get_health_summary` is only a quick snapshot and source of DOB/context. Do
  not use it for schedule analysis.
- `get_immunizations` paginates in rolling ~3-year windows even when a larger
  `years` value is requested.
- Immunization identity should key off `CVX`, not the free-text
  `Immunization` column.
- Use `OccurrenceDate` for schedule timing when available. Do not rely only on
  `Date`.
- `PrimarySource` is a major data-quality signal. `PrimarySource=No` usually
  means an imported external record with weaker detail.
- `search` and `search_clinical_notes` are richer fallback tools when the
  tabular columns are not enough.

## Workflow

1. Run the required entry checks above before any analysis.
2. Call `get_health_summary` for quick DOB and context, but never use it as the
   sole basis for immunization completeness.
3. Choose retrieval mode intentionally:
   - use `full mode` when childhood series completion, immigration, school or
     employment paperwork, or broad gap analysis is the goal
   - use `shallow mode` for narrowly scoped annual or interval questions such as
     recent flu, COVID, or Tdap status when deep childhood history is unlikely
     to change the answer
4. Pull immunization history from `get_immunizations` by following pagination as
   needed for the selected mode.
5. Prefer the single orchestrator `scripts/run_analysis.py` so parsing,
   normalization, comparison, and formatting happen in one invocation rather
   than several separate script calls.
6. If the available tool-call budget does not support a full pipeline run,
   degrade gracefully through the same formatted output shape. Do not add a
   separate execution preamble or planning narration before section 1.
7. Pull extra context only when the question needs it:
   - `get_labs` for titers or immunity questions
   - `get_allergies` for contraindication questions
   - `get_conditions` or `get_medications` for immunosuppression context
   - `get_procedures` for special-population context such as splenectomy
   - `get_visits` when encounter linkage materially helps
8. Use `search` or `search_clinical_notes` as fallback tools when you need
    richer FHIR fields, narrative vaccine context, or details missing from the
    tabular response.
9. Parse titers with `scripts/parse_titers.py` when immunity or proof-of-
   immunity questions are in scope.
10. Choose the recommendation source:
   - default to CDC guidance
   - prefer ECDC guidance if the user explicitly frames the question around
     Europe, a European country of residence, or a European recommendation
     source
11. Compare the normalized record to the bundled schedule references using
   `scripts/compare_schedule.py`. Use CDC CDSi as an implementation companion
   for reasoning structure, but cite CDC or ECDC as the public-facing authority.
12. Distinguish between clearly documented vaccines, likely gaps, likely due
    items, and areas where the record is incomplete or ambiguous.
13. Produce corrective actions with `scripts/format_output.py` and clearly label
    assumptions, uncertainty, and verification steps.

## User-Visible Response Rules

- For any substantive immunization analysis, the user-facing response should be
  a single final answer block in the standard numbered sections and footer.
- Prefer the output from `scripts/run_analysis.py` and `scripts/format_output.py`
  over hand-writing the sections.
- Do not narrate tool calls, retries, approvals, budget constraints, or
  execution choices outside the formatted sections.
- Do not mention internal script names, intermediate JSON, checkpoints, or
  debug artifacts in the user-facing answer.
- Do not paste or summarize intermediate checkpoints.
- If the analysis had to degrade because the full runtime path could not be
  completed, say that only inside the formatted output, not as a separate
  preamble.
- The disconnect message in the entry checks is the only allowed non-formatted
  fallback when HealthEx access is unavailable.

## Normalization Rules

- Reverse per-column dictionary references such as `@1` by column scope only.
- Apply downward inheritance for empty cells in tabular outputs.
- Treat `OccurrenceDate` as the primary administration date when present.
- Deduplicate likely duplicate records using `(OccurrenceDate, CVX)` and prefer
  the primary-source record when one exists.
- Preserve `PrimarySource`, `ReportOrigin`, `LotNumber`, `Dose`, `Route`,
  `Site`, `Manufacturer`, `EncounterId`, and `LastUpdated` in the normalized
  record.
- Group related CVX codes by antigen series where schedule reasoning depends on
  the series rather than one product code.
- Keep records with missing CVX as `unclassified` rather than forcing them into
  a schedule bucket.
- Drop records with no usable date from schedule math, but surface them in the
  analysis as skipped or unclassified.

## Titer And Immunity Questions

For immunity or titer-related questions:

1. Pull immunization history first.
2. Pull relevant labs with `get_labs`.
3. Parse the lab output with the same tabular parser and then with
   `scripts/parse_titers.py`.
4. Use `references/titers-and-supporting-context.md` to interpret common
   immunity-related labs.
5. Explain clearly when the answer depends on titers, prior disease history, or
   clinician interpretation rather than immunization records alone.

## Output Rules

- Always report record freshness and whether the chart may be stale.
- Base conclusions on record evidence retrieved in the current session.
- Explicitly say whether the review used full paginated immunization history or
  a lighter or incomplete history pull, but do so inside the numbered sections.
- Prefer confidence language such as `likely current`, `likely due`,
  `possibly due pending missing history`, `context required`, and
  `unable to determine`.
- Do not invent vaccine dates, series completion, contraindications, or risk
  factors that are not present in the record.
- Treat imported records with `PrimarySource=No` as weaker evidence than
  primary-source records.
- Call out missing CVX, duplicate artifacts, stale sync, and sparse imported
  history as data-quality limitations.
- If the record is incomplete or contradictory, still provide cautious next
  steps when helpful, but clearly list the assumptions driving them.
- Include a final footer with skill version, schedule source version, and sync
  date.
- Keep the result reviewer-friendly and easy to scan.

Return results using the structure described in `references/output-contract.md`.

## Source Hierarchy

Follow the source hierarchy in `references/cdc-acip-scope.md` to select the
appropriate CDC, ACIP, or ECDC schedule and explain which authority anchors the
review.

## HealthEx-Specific References

- Use `references/cvx-antigen-groups.md` when mapping CVX codes to antigen
  groupings.
- Use `references/data-quality-flags.md` when deciding whether confidence must
  be lowered.
- Use `references/titers-and-supporting-context.md` for immunity, lab, and
  contraindication workflows.

## Limitations And Safety

Apply the limitations and disclaimer guidance in
`references/limitations-and-disclaimer.md` whenever the record is sparse,
ambiguous, or not adequate for a high-confidence forecast.
