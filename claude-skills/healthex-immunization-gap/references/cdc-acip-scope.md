# CDC And ACIP Source Hierarchy

## Clinical Source Of Truth

Use CDC/ACIP guidance as the default clinical authority for immunization-gap
review.

Preferred hierarchy:

1. the current CDC immunization schedule for the patient's age band
2. CDC schedule notes and ACIP vaccine-specific guidance when the schedule alone
   is not enough
3. CDC CDSi only as an implementation companion for evaluation logic and
   forecasting structure

If the user explicitly asks for a European recommendation source, describes
European residence, or frames the question around a specific European country,
route the answer through the bundled `ECDC Vaccine Scheduler` reference and say
that national schedule variation may still matter.

Do not present CDC CDSi as the primary clinical authority. Present it as a
technical aid that helps structure the evaluation.

## Schedule Selection

Start by determining the patient's age from the record.

- If the patient is clearly an adult, use the CDC adult immunization schedule.
- If the patient is clearly under 19, use the CDC child and adolescent schedule.
- If the age band cannot be determined confidently, say that the schedule path
  could not be selected with confidence and lower the certainty of the review.

## Comparison Expectations

When comparing the record to CDC/ACIP guidance:

- review immunization evidence across all available time
- use the patient's age at present and the timing of documented doses when
  timing clearly matters
- use `OccurrenceDate` for schedule timing when available and fall back to
  `Date` only when needed
- use `CVX` as the primary vaccine identity key rather than the drifting
  free-text vaccine name
- avoid pretending a production-grade forecast exists if product, series, or
  spacing details are missing
- downgrade confidence when risk group, contraindication, prior disease, or
  outside vaccination history is missing
- downgrade confidence when the record is stale, heavily imported, or missing
  CVX-backed vaccine identity

## What To Cite In The Answer

When summarizing the review for the user:

- cite CDC/ACIP as the recommendation source
- cite ECDC when the answer is routed through the Europe-aware schedule
- say the analysis is based on the available HealthEx record
- mention that missing outside records can change the conclusion
- mention when recent sync freshness or imported records reduce confidence
- include the bundled schedule `version_date` in the final footer
