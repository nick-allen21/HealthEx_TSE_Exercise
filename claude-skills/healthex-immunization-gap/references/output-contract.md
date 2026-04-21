# Output Contract

Return the review in the following order.

## 1. Patient Context

State the patient context used for the review:

- age or age band if available
- whether the review is based on live HealthEx connector data or a user-supplied
  fallback summary
- any major missing context that affects certainty

## 2. Data Reviewed

Briefly describe what evidence was reviewed:

- immunization records available in HealthEx
- other supporting chart context if it materially affects the analysis
- obvious data gaps, such as no immunization history, sparse timeline coverage,
  or conflicting entries

## 3. Immunizations Likely Current

List vaccines or immunization areas that appear up to date based on the
available record. Keep this section short and evidence-based.

## 4. Potential Gaps Or Overdue Items

For each likely gap, include:

- vaccine or immunization area
- why it appears due, overdue, missing, or indeterminate
- the confidence level

Use one of these labels:

- `likely current`
- `likely due`
- `possibly due pending missing history`
- `unable to determine from available record`

## 5. Corrective Actions To Consider

Offer practical next steps for the user, such as:

- confirm outside vaccination history
- verify contraindications or special risk factors with a clinician
- discuss indicated vaccination with a clinician or pharmacist
- request missing records before acting on a low-confidence forecast

Prefer concrete next actions over abstract commentary.

## 6. Assumptions And Missing Data

Explicitly list the assumptions that materially affected the review.

Examples:

- no outside vaccination records were available
- risk factors could not be confirmed from the record
- the timeline may be incomplete

## 7. Non-Clinical Disclaimer

Close with a short disclaimer that:

- the review is informational and based on the available record
- the user should confirm decisions with an appropriate clinician
- missing records or context can change the recommendation
