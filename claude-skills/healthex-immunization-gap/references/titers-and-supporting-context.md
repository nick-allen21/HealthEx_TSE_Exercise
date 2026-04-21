# Titers And Supporting Context

Use this guidance when the user asks whether they are immune, whether they need
proof of immunity, or whether vaccination history alone is enough to answer the
question.

## Core Rule

Immunization history alone is not always enough to answer an immunity question.

When the user asks about immunity, prior exposure, or whether a booster is
still needed, check whether labs, contraindications, or special-risk context are
required.

## Primary Supporting Tools

- `get_labs`: titers and immunity-related lab results
- `get_allergies`: contraindication context such as egg, gelatin, neomycin, or
  latex concerns
- `get_conditions`: immunocompromising conditions or other clinical context
- `get_medications`: immunosuppressants that may affect live-vaccine reasoning
- `get_procedures`: special-population context such as splenectomy
- `search_clinical_notes`: provider narrative when structured fields are not
  enough

## Common Immunity-Related Labs

These are examples observed in the HealthEx schema exploration:

- Measles IgG
- Mumps Antibody IgG
- Rubella Antibody IgG
- Hepatitis B surface antibody related results
- Varicella immunity-related labs

Interpret these carefully:

- `Immune` or similar wording can support an immunity answer
- `Non-immune` can support a likely due or follow-up conclusion
- `Indeterminate` should lower confidence, not force a clean answer

## How To Use Titers In Answers

- join the relevant immunization history to the relevant labs
- explain whether the titer supports, weakens, or complicates the vaccine-only
  answer
- if the answer depends on clinical interpretation, say so explicitly
- do not treat a missing titer as proof that a vaccine is due

## Good Use Cases

- `Do I appear immune to measles?`
- `Do I need an MMR booster?`
- `Do I have proof of hepatitis B immunity?`

## Guardrails

- keep the answer informational
- do not claim lab interpretation is definitive clinical advice
- say when a clinician should confirm the meaning of the result
