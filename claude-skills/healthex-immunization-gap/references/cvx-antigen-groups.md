# CVX And Antigen Group Guidance

Use `CVX` as the primary vaccine identity key.

Do not base schedule logic on the free-text `Immunization` column because the
display string can drift over time for the same underlying vaccine family.

## Working Rule

- `CVX` identifies the vaccine code
- antigen grouping identifies the broader series relevant to schedule reasoning
- the free-text name is only a display label

## Useful Known Groupings

This is not a full CDC CVX catalog. It is a practical mapping for the codes
observed during HealthEx schema exploration and common assignment-relevant
reasoning.

| CVX | Vaccine | Suggested antigen group |
|---|---|---|
| `03` | MMR | `mmr` |
| `08` | Hepatitis B, pediatric/adolescent | `hepb` |
| `10` | IPV | `ipv` |
| `20` | DTaP | `dtap` |
| `21` | Varicella | `varicella` |
| `48` | Hib PRP-T | `hib` |
| `49` | Hib PRP-OMP | `hib` |
| `83` | Hepatitis A, pediatric/adolescent | `hepa` |
| `100` | PCV7 | `pcv` |
| `114` | MenACWY-D | `menacwy` |
| `115` | Tdap | `tdap` |
| `133` | PCV13 | `pcv` |
| `140` | Influenza trivalent injectable | `influenza` |
| `150` | Influenza quadrivalent injectable | `influenza` |
| `155` | Influenza live intranasal | `influenza` |
| `163` | MenB | `menb` |
| `165` | HPV9 | `hpv` |
| `208` | COVID-19 Pfizer original | `covid19-pfizer` |
| `217` | COVID-19 Pfizer updated tris-sucrose | `covid19-pfizer` |
| `309` | COVID-19 Pfizer 12Y+ 30 mcg/0.3 mL | `covid19-pfizer` |

## Design Notes

- Group related COVID CVX codes at the antigen-series level unless the question
  specifically requires product/formulation detail.
- Keep records with missing CVX as `unclassified`.
- If a combination vaccine appears, do not infer a more specific antigen split
  than the available code and guidance justify.
- When a schedule question depends on exact formulation or product timing,
  mention that product-level detail may still be missing even when CVX is
  present.
