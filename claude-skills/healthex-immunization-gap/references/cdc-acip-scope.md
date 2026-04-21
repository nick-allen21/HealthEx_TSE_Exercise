# CDC And ACIP Source Hierarchy

## Clinical Source Of Truth

Use CDC/ACIP guidance as the clinical authority for immunization-gap review.

Preferred hierarchy:

1. the current CDC immunization schedule for the patient's age band
2. CDC schedule notes and ACIP vaccine-specific guidance when the schedule alone
   is not enough
3. CDC CDSi only as an implementation companion for evaluation logic and
   forecasting structure

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
- avoid pretending a production-grade forecast exists if product, series, or
  spacing details are missing
- downgrade confidence when risk group, contraindication, prior disease, or
  outside vaccination history is missing

## What To Cite In The Answer

When summarizing the review for the user:

- cite CDC/ACIP as the recommendation source
- say the analysis is based on the available HealthEx record
- mention that missing outside records can change the conclusion
