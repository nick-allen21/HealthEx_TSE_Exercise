---
name: healthex-immunization-gap
description: Use when reviewing HealthEx vaccine history, identifying likely vaccine gaps or overdue immunizations, or suggesting catch-up actions from HealthEx data using CDC/ACIP guidance.
---

# HealthEx Immunization Gap Review

## Purpose

Use this skill to review a patient's immunization history from HealthEx, compare
the available evidence against CDC/ACIP guidance, and propose cautious
corrective actions.

## Use This Skill When

- the user asks about vaccine or immunization history
- the user wants to identify missing, overdue, or likely due vaccines
- the user wants catch-up, corrective, or follow-up vaccine actions
- the user wants preventive-care gap review where immunizations are clearly part
  of the request
- the user wants the answer grounded in HealthEx records rather than generic
  vaccine education

## Do Not Use This Skill When

- the user only wants a generic chart summary with no immunization focus
- the request is about medications, labs, diagnoses, or conditions unrelated to
  vaccines
- the request needs a medical diagnosis or individualized clinical judgment that
  cannot be supported by the available record

## Required Access

This skill depends on the HealthEx connector and tool access to the patient's
record.

If HealthEx is not connected, or the tools needed to inspect the patient's
record are unavailable:

1. tell the user the skill requires HealthEx access
2. ask the user to connect HealthEx and allow tool access
3. stop before making immunization-gap claims from memory or general knowledge

Only continue without HealthEx access if the user explicitly provides a
structured immunization history some other way and asks for a best-effort
review. In that case, clearly label the analysis as lower confidence.

## Workflow

1. Confirm HealthEx connector access before analyzing the record.
2. Retrieve the patient's immunization-relevant longitudinal history from
   HealthEx. Prefer all-time history over a recent-only snapshot.
3. Determine the patient's age and any obvious context needed to choose the
   correct CDC/ACIP schedule path.
4. Review the available immunization evidence across the full timeline.
5. Compare the record to CDC/ACIP guidance. Use CDC CDSi as an implementation
   companion for evaluation logic, but cite CDC/ACIP as the clinical authority.
6. Distinguish between clearly documented vaccines, likely gaps, and areas where
   the record is incomplete or ambiguous.
7. Propose corrective actions the user can take next, while explicitly labeling
   assumptions, uncertainty, and verification steps.
8. End with a non-clinical disclaimer and avoid overstating certainty.

## Output Rules

- Base conclusions on record evidence retrieved in the current session.
- Prefer confidence language such as `likely current`, `likely due`,
  `possibly due pending missing history`, and `unable to determine`.
- Do not invent vaccine dates, series completion, contraindications, or risk
  factors that are not present in the record.
- If the record is incomplete or contradictory, still provide cautious next
  steps when helpful, but clearly list the assumptions driving them.
- Keep the result reviewer-friendly and easy to scan.

Return results using the structure described in `references/output-contract.md`.

## Source Hierarchy

Follow the source hierarchy in `references/cdc-acip-scope.md` to select the
appropriate CDC/ACIP schedule and explain which authority anchors the review.

## Limitations And Safety

Apply the limitations and disclaimer guidance in
`references/limitations-and-disclaimer.md` whenever the record is sparse,
ambiguous, or not adequate for a high-confidence forecast.
