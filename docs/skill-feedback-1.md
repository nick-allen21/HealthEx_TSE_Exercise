# Notes on `immunization-gap-analysis` v1.0.0

Feedback from a live run against Nick's actual HealthEx records (22yo, ~23 years of history, ~60 immunizations, multi-pagination adult review). Organized as: what clearly worked, where I hit friction, and concrete suggestions ranked by impact.

## TL;DR

The skill's *structure* is excellent. SKILL.md, output contract, reference schedules, and confidence vocabulary all did their job and kept the final answer disciplined. The main problems are operational: the Python pipeline is hard to actually execute within a tool-call budget, pagination for adults is heavier than the skill acknowledges, and the bundled adult schedule is thin enough that a lot of real records fall into `context_required` / `unable to determine` and the output reads less useful than it could.

---

## What worked well

**Workflow scaffolding.** The numbered workflow in SKILL.md was easy to follow linearly. The explicit "required entry checks" at the top stopped me from jumping straight into analysis, and the "do not use" section prevented me from applying this skill to, say, a general health summary question.

**Guardrail against `get_health_summary` drift.** The explicit callout that `get_health_summary` is for DOB/context only, not for schedule analysis, is the kind of thing an LLM will absolutely get wrong without the warning. I noticed myself wanting to shortcut the pagination and that line pulled me back.

**Confidence vocabulary.** `likely current` / `likely due` / `possibly due pending missing history` / `unable to determine from available record` is a small, controlled set that forced me to be honest about ambiguity instead of hedging in freeform prose. Keep this.

**PrimarySource emphasis.** Three of Nick's COVID records are `PrimarySource=No` (auto-reconciled from outside). The skill primed me to flag those specifically as weaker evidence, which I wouldn't have noticed unprompted.

**The output contract.** Nine numbered sections in a fixed order is very grindable for an LLM. It also makes the output reviewer-friendly, which is probably what matters to clinicians reading this.

**Required closing + version footer.** Having a verbatim disclaimer removes an entire category of drift risk. The footer (skill version, schedule source, sync date) is exactly the provenance signal this kind of output needs.

**CDC CDSi as reasoning companion, CDC/ECDC as public authority.** Good separation. Keeps the bundled logic simple while still citing the authoritative source.

---

## Where I hit friction

### 1. The Python pipeline is hard to actually execute (high priority)

SKILL.md prescribes: `parse_tabular.py` → `paginate.py` → `normalize_immunizations.py` → `compare_schedule.py` → `format_output.py`. In practice that is 5+ bash invocations on top of 8 HealthEx pagination calls plus entry checks. I ran out of tool-call budget before the pipeline started and had to reconstruct the output by hand, which is exactly the failure mode scripts are meant to prevent.

Suggestions, in order of how I'd do them:

- **Add a single orchestrator script** (`scripts/run_analysis.py`) that takes the raw HealthEx response strings as input and runs parse → paginate → normalize → compare → format end-to-end, writing JSON checkpoints between stages. One bash call, five artifacts.
- **Or move the pipeline into a single module** with a `run(windows, titers, patient)` function, and let the LLM call it once.
- **Document the tool-call budget.** Something like "for a typical adult, expect ~8 pagination calls plus 1 pipeline invocation. If you can't afford that, degrade gracefully to a reasoning-only pass and say so in section 3 of the output." That degradation path exists implicitly (I used it), but making it explicit would remove the guilt.

### 2. Pagination is heavier than the skill acknowledges (high priority)

`get_immunizations` paginates in 3-year windows regardless of the `years` parameter. For a 22-year-old with full history that's 8+ calls. For a 45-year-old it's 15+. The skill says "follow every pagination instruction until no more data remains," which is correct but operationally expensive.

Options:

- Offer a documented **"shallow mode"**: for questions about current status of annual/interval vaccines (flu, COVID, Tdap), the last 10–15 years is enough. Skip the rest.
- **"Full mode"** only when series completion for childhood antigens is actually in question (e.g., undocumented adult, immigration/employment paperwork, immunocompromise workup).
- Either way, have the skill estimate the pagination cost up front from DOB + earliest expected record.

### 3. Adult schedule snapshot is too thin (high priority for output usefulness)

`cdc_adult_schedule.json` covers 9 antigens, but four of them (HepB, HPV, MenACWY, MenB) have `logic.type = "context_required"`, which maps to "unable to determine from available record." So half the rules produce a shrug. In this run, Nick had a complete 3-dose HepB infant series, a 2-dose Gardasil 9 at age 14 (valid under the 2-dose rule because both doses were before age 15), two MenACWY, and two MenB. None of that got credit.

Concrete fills:

- **HPV:** implement the age-at-first-dose rule. If first dose before age 15 and ≥2 doses with ≥5 months between them, mark `likely current`. If first dose at/after 15, require 3 doses.
- **HepB:** if ≥3 documented doses with reasonable spacing, mark `likely current`. If titer available in labs (anti-HBs ≥10 mIU/mL), use that (already in the titer workflow, just add the antigen).
- **MenACWY:** for adults, credit the adolescent 2-dose schedule (one at 11–12, booster at 16) as `likely current` absent ongoing risk context. Only mark due if explicit risk context is passed in.
- **MenB:** 2-dose Bexsero or 2-/3-dose Trumenba within the last 5 years → `likely current`. No risk context → not routinely recommended, mark as "not routinely indicated, context-dependent" rather than `unable to determine`.
- **Add Hepatitis A, IPV adult booster (travel), pneumococcal (risk-based + age 50+), zoster (50+), RSV (50+/75+).** Most are age-gated and can be no-ops for a 22-year-old, but they're needed for the skill's broader audience.

A middle-ground option: add a `context_required` output label distinct from `unable to determine`, and have the format step prompt the user for the specific context needed. Right now both collapse into the same bucket.

### 4. CVX coverage gaps + missing display-name fallback (medium priority)

Nick's history has several pre-2013 records with no CVX code (e.g., "MMR 2", "Varicella 2", "Tdap (boostrix)", older live-nasal flu, MCV4-Menactra). `normalize_immunizations.py` flags these as `missing_cvx` → `unclassified`, which drops them from schedule math entirely. That's a correctness problem for anyone with older records.

Fix: add a display-name heuristic in the normalizer. A small ordered regex list (e.g., `r"tdap|boostrix|adacel"` → `tdap`, `r"\bmmr\b"` → `mmr`, `r"varicella|varivax"` → `varicella`, `r"influenza|flumist"` → `influenza`) would catch 90% of the older records cleanly. Keep the `missing_cvx` quality flag so the output still notes the record is weaker evidence.

Also missing from `cvx_codes.json`:

- **101** (Typhoid Vi) — Nick has two, both recorded as 101 in the tabular output. Currently `unsupported_cvx`.
- **111** (Influenza live intranasal, old code) and other legacy flu CVX.
- **10** is in the map but the historical IPV records use no CVX at all.

### 5. PPD shows up as an immunization (low priority, small correctness bug)

PPD skin test (2011-09-08) is in `get_immunizations` output. It's a TB screening test, not a vaccine. The normalizer doesn't currently filter these. Add an explicit exclusion list (`PPD`, `QuantiFERON`, etc.) or filter on SNOMED/display-name. Otherwise it inflates the "total records" count and can confuse downstream counting.

### 6. Titer integration is manual (medium priority)

The skill documents a titer workflow and `compare_schedule.py` respects a `titer_status_by_antigen` map, but nothing actually parses titers out of `get_labs`. For Nick, I had to eyeball "Measles IgG: Immune", "Mumps IgG: Immune", "Rubella IgG: Immune" from the health summary and mentally populate the dict. A `scripts/parse_titers.py` that recognizes the usual panel names (Measles IgG, Mumps IgG, Rubella IgG, VZV IgG, anti-HBs, anti-HAV Total IgG, anti-HCV) and maps "Immune" / numeric cutoffs to `{antigen: {immune: true, source: ...}}` would close the loop. Right now the feature is vestigial.

### 7. `has_missing_history` is too trigger-happy (low priority)

In `compare_schedule.py`, `has_missing_history` is set to True if *any* record in the antigen group is `external_record`. That downgrades "likely due" to "possibly due pending missing history" for that antigen, even when we have plenty of clean primary-source data for the same antigen. For Nick's COVID, the 2024-12-12 primary-source dose is unambiguous; the three older external_record doses don't add ambiguity about when the last shot was given.

Suggestion: only set `has_missing_history = True` when ambiguity is actually about series completion or most-recent-dose dating, not just source provenance.

### 8. COVID-19 annual logic is too simplistic (note-worthy)

`logic.type = "annual", interval_years = 1` will mark anyone past 12 months as "likely due," including healthy young adults where current CDC guidance is more nuanced. The schedule JSON note says "Verify current season-specific CDC guidance," which is honest, but the binary output label doesn't reflect that nuance. A `context_required` label with a pointer to "check current season recommendation + personal risk factors" would be more accurate for COVID than a hard "likely due."

### 9. No childhood series completeness check for adult reviews

For a 22-year-old, the interesting infant-series question is "were the routine childhood vaccines completed on schedule?" not "are you due for more." The adult schedule doesn't encode this. You could add a one-time audit pass: for patients ≥18, verify presence of HepB ×3, Hib ×3–4, PCV ×4, DTaP ×5, IPV ×4, MMR ×2, Varicella ×2, Hep A ×2. Report anything missing as a documentation gap (not necessarily a clinical gap). That would have caught Nick's complete infant series and credited it, which felt underutilized in my output.

### 10. Minor

- `SKILL_VERSION = "1.0.0"` is hardcoded in `format_output.py` and also in SKILL.md frontmatter. Easy drift. Read from frontmatter.
- No fixtures under `references/` or `tests/`. Sample `get_immunizations` windows + expected normalized JSON would make this skill much easier to regression-test when HealthEx changes their output format.
- The required closing disclaimer is ~80 words verbatim. Fine as-is, just flagging it's the kind of thing users start skimming past. A shorter version plus a link to the long form would work equally well.
- The output contract's section 5 ("Immunizations Likely Current") can read as reassuringly complete. Consider adding a soft line at the top of that section: "This list reflects the bundled schedule rules only. Clinical judgment and risk context may add or remove items."

---

## Edge cases I'd add to a test suite

1. Adult with complete childhood series + no adult boosters yet (tests series-completion credit).
2. Adult with only PrimarySource=No records for the last 5 years (tests the `has_missing_history` logic from point 7).
3. Patient with labs showing anti-HBs ≥10 but no HepB vaccine records (tests titer-override path end-to-end).
4. Records with no CVX at all, only display names (tests the fallback heuristic from point 4).
5. Patient younger than 19 where the adult/child cutoff logic picks `cdc_child_schedule` (tests `_compute_age_years`).
6. Stale sync (>30 days) — make sure the warning actually reaches the top of the output, not buried in section 2.
7. Empty immunization history — make sure the skill produces a useful output instead of a stack trace.
8. Duplicate `(OccurrenceDate, CVX)` pairs where one is primary and one is external (tests the dedupe prefer-primary logic).
9. Travel-vaccine-heavy record (Typhoid, Yellow Fever, Japanese Encephalitis, cholera) — tests unsupported-CVX graceful handling.
10. Pediatric patient mid-series (e.g., 6 months old, between DTaP doses) — tests the child schedule's interval logic, which I didn't exercise at all.

---

## Suggested next step

If I had to pick one change, it would be **#1: a single orchestrator script that runs the whole pipeline in one bash call.** That alone would convert this skill from "produces good output when the LLM has headroom" to "produces good output reliably." Everything else is polish on top.

If you want, next time around I can (a) draft that orchestrator, (b) extend the adult schedule with the HPV age-at-first-dose + HepB titer-credit logic, or (c) build the test fixtures from Nick's real paginated output as the first regression case.