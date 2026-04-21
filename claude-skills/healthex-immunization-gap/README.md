# HealthEx Immunization Gap Skill

This folder contains the uploadable Claude skill package for the HealthEx
immunization-gap portion of the exercise.

## Folder Contents

- `SKILL.md`: trigger metadata and core workflow instructions
- `references/cdc-acip-scope.md`: recommendation-source hierarchy and schedule
  selection guidance
- `references/output-contract.md`: required response structure and confidence
  language
- `references/limitations-and-disclaimer.md`: safety, uncertainty, and
  disclaimer guidance

## Reviewer Notes

The skill is designed to sit on top of the HealthEx connector rather than the
browser-token FHIR fetch flow used by the local web UI.

That means:

- the web app and the skill use related patient data concepts
- the skill still requires the user to connect HealthEx and allow tool access in
  Claude before it can analyze the record
- the skill should pause and ask for HealthEx access instead of guessing
  immunization status from incomplete context

## Upload Notes

To upload this as a custom skill, package the folder so that `SKILL.md` is at
the top level of the uploaded directory and the `references/` folder sits beside
it.
