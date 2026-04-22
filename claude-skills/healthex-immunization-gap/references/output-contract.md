# Output Contract

Return the review in the following order.

## 1. Patient Context

State the patient context used for the review:

- age or age band if available
- whether the review is based on live HealthEx connector data or a user-supplied
  fallback summary
- whether the review reflects a full or lighter history pass
- any major missing context that affects certainty

## 2. Record Freshness

State:

- the `lastUpdated` freshness result if available
- whether the record may be stale or unsynced
- reconnect guidance if the connector surfaced it

## 3. Data Reviewed

Briefly describe what evidence was reviewed:

- immunization history available through HealthEx
- whether the review reflects a full history pull or a lighter pass
- any additional chart context that materially affected the answer, such as lab,
  allergy, condition, medication, procedure, or visit context
- obvious data gaps, such as no immunization history, sparse timeline coverage,
  or conflicting entries

Do not describe connector mechanics, tool names, or execution steps in this
section.

## 4. Data Quality Flags

Explicitly call out material quality flags, such as:

- imported records with `PrimarySource=No`
- missing CVX
- duplicate `(OccurrenceDate, CVX)` artifacts
- missing manufacturer, dose, lot, route, or site on records that matter
- stale sync date

## 5. Immunizations Likely Current

List vaccines or immunization areas that appear up to date based on the
available record. Keep this section short and evidence-based.

## 6. Potential Gaps Or Overdue Items

For each likely gap, include:

- vaccine or immunization area
- why it appears due, overdue, missing, or indeterminate
- the confidence level

Use one of these labels:

- `likely current`
- `likely due`
- `possibly due pending missing history`
- `context required`
- `unable to determine from available record`

If titers materially affect the answer, say so here rather than burying it in
assumptions.

If the answer depends on missing context rather than missing data, prefer
`context required` over `unable to determine from available record`.

## 7. Corrective Actions To Consider

Offer practical next steps for the user, such as:

- confirm outside vaccination history
- verify contraindications or special risk factors with a clinician
- discuss indicated vaccination with a clinician or pharmacist
- request missing records before acting on a low-confidence forecast
- obtain relevant titers or verify prior titers when immunity questions remain
  unresolved

Prefer concrete next actions over abstract commentary.

## 8. Assumptions And Missing Data

Explicitly list the assumptions that materially affected the review.

Examples:

- no outside vaccination records were available
- risk factors could not be confirmed from the record
- the timeline may be incomplete
- no relevant titers were available
- imported records may omit product-level details

## 9. Non-Clinical Disclaimer

Close with a short disclaimer that:

- the review is informational and based on the available record
- the user should confirm decisions with an appropriate clinician
- missing records or context can change the recommendation

Then add a one-line footer with:

- skill version
- bundled schedule source and `version_date`
- HealthEx sync date

Do not add tool-call narration, retry commentary, or execution summaries before
or after the numbered sections.
