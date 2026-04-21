# HealthEx API Reference for Agent Skill Development

> **Scope of this doc.** Written for an agent building a new skill on top of HealthEx, with a specific focus on an **immunizations skill** (schedule tracking, coverage analysis, due/overdue detection, recall checks). General patterns apply to any HealthEx skill; immunization-specific callouts are flagged with 💉.

---

## 1. TL;DR for skill authors

1. HealthEx returns three **distinct output formats** across its tools — one flat blob, one dictionary-compressed tabular format, and one flattened-FHIR format. Your skill needs a normalizer for each.
2. Every category tool paginates in **rolling ~3-year windows**, regardless of the `years` parameter you pass. A full childhood vaccine history for a 23-year-old requires ~8 paginated calls.
3. Vaccine records are keyed by **CVX codes** (the CDC standard). Name strings drift over time; CVX does not. All schedule/coverage logic should key off CVX, not the free-text `Immunization` column.
4. The `primarySource` field ("Yes"/"No") is the most important data-quality flag for immunizations. Records with `primarySource=No` ("Auto Reconciled From Outside Source") are typically missing lot numbers, dose, route, and site.
5. `search` and `search_clinical_notes` return richer FHIR-level fields than the structured tools — use them as an escape hatch when the tabular columns don't cover what you need.

---

## 2. Tool catalog

| Tool | Purpose | Output format | Paginates? | 💉 Immunization relevance |
|---|---|---|---|---|
| `get_health_summary` | Cross-category snapshot of current state | **Flat summary blob** | No | Counts only; truncated list of vaccines — not enough for schedule analysis |
| `get_immunizations` | Full vaccine history | **Tabular (dict-compressed)** | Yes, ~3y window | **Primary source of truth for the skill** |
| `get_conditions` | Dx list with ICD10/SNOMED | Tabular | Yes | Needed for contraindications (e.g., immunocompromised, egg allergy) |
| `get_medications` | Prescriptions + inpatient meds | Tabular | Yes | Needed for immunosuppressants that affect live-vaccine eligibility |
| `get_labs` | Lab results (LOINC) | Tabular | Yes | Titer results live here (MMR IgG, Hepatitis B surface Ab, Varicella IgG, Quantiferon) |
| `get_vitals` | Vitals with types enumerable | Tabular | Yes | Rarely needed for immunizations |
| `get_procedures` | Surgeries/diagnostics (SNOMED/CPT) | Tabular | Yes | Splenectomy → altered vaccine schedule; rare but relevant |
| `get_allergies` | Allergens + criticality | Tabular | Yes | **Critical** for vaccine contraindications (egg, gelatin, neomycin, latex) |
| `get_visits` | Encounters with IDs | Tabular | Yes | Encounter IDs link vaccines to visit context |
| `search` | Cross-category semantic search | **Flattened FHIR** (dot-notation) | No | Returns full FHIR `Immunization` resources — richer than `get_immunizations` |
| `search_clinical_notes` | Narrative text + encounter notes | FHIR Binary with text payload | No (uses years param) | Pulls provider notes mentioning vaccines, titer recommendations, travel counseling |
| `update_and_check_recent_records` | Freshness check + reconnect URL | **JSON object** | No | Tell the user when data was last synced; surface the reconnect URL if stale |

---

## 3. Output formats in detail

HealthEx is not consistent across tools. You need three parsers.

### 3.1 Flat summary blob — `get_health_summary`

```
PATIENT: Name, DOB YYYY-MM-DD
PROVIDERS: Provider Name
PROVIDERS_SINCE: YYYY-MM-DD

CONDITIONS(shown/total): Active: name@provider date | ...
LABS(total): Name:value unit(ref:range) date@provider[totalrecords:N,OutOfRange:M] | ...
ALLERGIES(total): ...
PROCEDURES(total): name date@provider | ...
IMMUNIZATIONS(total): name date@provider | ...
CLINICAL VISITS(total): type:description:name date@provider | ...
```

- One giant pipe-delimited string.
- `@provider` appended to every record.
- Labs only show a name + most recent value; no historical values, no lot/dose/site on immunizations. Use this **only** for the quick "what does this patient look like" check.
- Section counts use `shown/total` or just `total`. When they differ, you're seeing a truncation.

### 3.2 Dictionary-compressed tabular — all `get_*` category tools

Example from `get_immunizations`:

```
#Immunizations 3y|Total:4
D:1=2024-12-12|
S:1=completed|
Note: Empty Date means same as previous row. Lookup refs (e.g., @1) refer to dictionaries above...
Date|Immunization|Status|...|CVX|NDC|SNOMED|...|LotNumber|Dose|Route|Site|...|EncounterId|...
2025-12-15|Influenza seasonal injectable, preservative free, trivalent|@1|...|140|49281-0425-50||...|U8919AA|0.5 mL|Intramuscular|Left deltoid|...|eSdHqa0A...|
@1|Pfizer Age 12Y+, 30 mcg/0.3 mL, SARS-CoV-2 Vaccination|@1|...|309|00069-2432-10||...|LP1776|0.3 mL|...
|TDAP, adsorbed|@1|...|115|49281-0400-58||...
```

Three compression tricks your parser must reverse:

1. **Per-column dictionaries.** `D:1=2024-12-12` declares the first date dictionary entry. A cell containing `@1` is a lookup. Each dictionary is **scoped to one column**: `@1` in `Date` is unrelated to `@1` in `Status` or `PreferredSystem`.
2. **Empty cells inherit downward.** A blank cell in `Date` means "same as the previous row". This is why the TDAP row above has no date — it's 2024-12-12 like the row above.
3. **Dictionaries are emitted only when values repeat.** A response with all unique dates won't include a `D:` dictionary at all.

Additional properties of this format:

- First line: `#<Category> <window>|Total:<count>`. Followed by dictionaries, then a `Note:` line, then a header row, then data rows.
- Some tools have extra metadata lines (e.g., `Flag=FHIR HL7 Interpretation` for labs, `V:` for vitals types).
- Section ends with a `---` separator followed by `**Pagination Info:**` block.

💉 **Immunization column set (confirmed):**

```
Date | Immunization | Status | StatusReason | PrimarySource | ReportOrigin |
OccurDateSource | OccurrenceDate | Recorded | CVX | NDC | SNOMED |
PreferredCode | PreferredSystem | LotNumber | ExpirationDate | Dose | Route |
Site | Manufacturer | Location | ReasonCodes | Performers | Notes |
EncounterId | MetaSource | LastUpdated
```

27 columns. Many are usually empty for externally reconciled records.

### 3.3 Flattened FHIR — `search` and `search_clinical_notes`

```
resourceType is Immunization. id is expwHEcjsSZFEw... identifier[0].use is usual.
vaccineCode.coding[0].system is http://hl7.org/fhir/sid/cvx. vaccineCode.coding[0].code is 140.
vaccineCode.text is Influenza seasonal injectable, preservative free, trivalent.
patient.reference is Patient/emDKhAx8ALkrKYOGlcha9Dg3. occurrenceDateTime is 2025-12-15T16:23:00Z.
primarySource is true. location.display is Weill Cornell... manufacturer.display is Sanofi Pasteur.
lotNumber is U8919AA. expirationDate is 2026-06-30. site.coding[0].code is 7.
site.coding[0].display is Left deltoid. route.coding[0].display is Intramuscular.
doseQuantity.value is 0.5. doseQuantity.unit is mL. ...
```

- Dot-notation flattening of a FHIR R4 resource; each field becomes one sentence.
- Array indices are inline: `identifier[0]`, `vaccineCode.coding[0]`, etc.
- Returns the **full** FHIR resource, so you get fields `get_immunizations` drops (local code systems, `identifier[0].value` internal ID, full actor references).
- Each result has a `Relevance Score` header.
- ⚠️ The `limit` parameter on `search` is a soft cap — a request for 5 returned 10 results in testing. Don't rely on it.

### 3.4 JSON — `update_and_check_recent_records`

```json
{
  "message": "Your health records were last updated on MM/DD/YYYY...",
  "lastUpdated": "2026-04-21T04:10:46.605Z",
  "reconnectUrl": "https://app.healthex.io#/patient-consent/..."
}
```

The only endpoint that returns clean JSON. Use it to tell the user when data was last synced — critical for an immunization skill where a missing recent vaccine might just mean the record hasn't synced, not that the vaccine wasn't given.

---

## 4. Pagination: the non-negotiable

**Key finding from direct testing:** HealthEx pages data in ~3-year windows, regardless of the `years` parameter you pass. Calling `get_immunizations(years=30)` does **not** return 30 years of data — it returns the first 3 years and hands you the next-call parameters.

Every paginated response ends with one of two blocks:

**No more data:**
```
Pagination Info:
- Date Range: 2023-04-21 to 2026-04-21
- Requested 3-year window: Fully covered
```

**More data exists:**
```
Pagination Info:
- Date Range: 2023-04-21 to 2026-04-21
- More data available: Yes

⚠️ IMPORTANT: To retrieve the remaining data, you MUST call the get_immunizations tool again with:
  - beforeDate: "2023-04-20"
  - years: 27
```

The server computes and tells you the next call — just parse and loop.

💉 **For immunizations specifically:** a full pediatric vaccine history for a young adult spans birth to present. For a patient born in 2003 (age 23), that's ~8 paginated calls. Don't call this inline for every user turn — **cache after the first full pass**.

Pseudocode:

```python
def fetch_all_immunizations():
    records = []
    before = None
    years = 5  # start wide; server caps anyway
    while True:
        response = get_immunizations(beforeDate=before, years=years)
        records.extend(parse_tabular(response))
        pagination = parse_pagination_block(response)
        if not pagination.more_available:
            break
        before = pagination.next_before_date
        years = pagination.next_years
    return records
```

---

## 5. 💉 Immunizations deep dive

### 5.1 Column semantics

| Column | Notes |
|---|---|
| `Date` | When the record was recorded (may differ from when the vaccine was given; usually same-day) |
| `Immunization` | Free-text name. **Do not key schedule logic off this.** Drifts over time (e.g., same flu vaccine appears with 5+ string variants across years). |
| `Status` | Usually `completed`. Can be `not-done`, `entered-in-error`. |
| `StatusReason` | Populated when status is not `completed` — e.g., refusal, contraindication |
| `PrimarySource` | **`Yes` = administered at this health system and directly recorded. `No` = imported from external source.** |
| `ReportOrigin` | When `PrimarySource=No`, this explains the import path (e.g., "Auto Reconciled From Outside Source") |
| `OccurrenceDate` | Actual admin date. Use this for schedule math, not `Date`. |
| `CVX` | **The primary key for vaccine identity.** CDC-maintained code. Always present when known. |
| `NDC` | National Drug Code — identifies the specific product (manufacturer + formulation + package size). Can vary year-to-year for the same CVX. |
| `SNOMED` | Secondary coding, often empty |
| `PreferredCode` / `PreferredSystem` | The code + system the source system designated as canonical. Usually duplicates CVX. |
| `LotNumber` / `ExpirationDate` | Present for primary-source records. **Use for FDA recall checks.** |
| `Dose` | e.g., `0.5 mL`, `0.3 mL`. Useful for validating adult vs. pediatric formulation. |
| `Route` | Intramuscular, Intranasal, Oral, Subcutaneous |
| `Site` | Left/Right deltoid, Nose, etc. |
| `Manufacturer` | Sanofi Pasteur, Pfizer, MedImmune, etc. Often empty on external records. |
| `Location` | Facility name |
| `EncounterId` | Links to a visit in `get_visits`. Opaque string like `eSdHqa0Auvq3PVa0hYATqQw3`. |

### 5.2 Common CVX codes worth knowing

Not comprehensive — use the [CDC CVX code set](https://www2a.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx) as your source of truth. These showed up in real records during schema exploration:

| CVX | Vaccine |
|---|---|
| 03 | MMR |
| 08 | Hepatitis B, adolescent/pediatric (HepB) |
| 10 | IPV |
| 20 | DTaP |
| 21 | Varicella |
| 48 | Hib (PRP-T, ActHIB/Hiberix) |
| 49 | Hib (PRP-OMP) |
| 83 | Hepatitis A, pediatric/adolescent (2-dose) |
| 100 | PCV7 (Prevnar) |
| 114 | Meningococcal conjugate ACWY-D (Menactra) |
| 115 | Tdap |
| 133 | PCV13 |
| 140 | Influenza, seasonal, trivalent, injectable, preservative-free |
| 150 | Influenza, quadrivalent, injectable, preservative-free |
| 155 | Influenza, seasonal, live intranasal |
| 163 | Meningococcal B, OMV recombinant adjuvanted (Bexsero) |
| 165 | HPV9 (Gardasil 9) |
| 208 | COVID-19, Pfizer-BioNTech (Purple Top, original) |
| 217 | COVID-19, Pfizer-BioNTech (Tris-sucrose, updated) |
| 309 | COVID-19, Pfizer-BioNTech (12Y+, 30 mcg/0.3 mL) |

**Nuance:** the CVX for COVID-19 Pfizer changed three times (208 → 217 → 309) across formulation updates. Your schedule logic should group related CVX codes into "antigen series" — many schedule APIs key off antigen group rather than individual CVX.

### 5.3 Data quality flags worth surfacing to the user

Your skill should distinguish these cases before telling a user "you're up to date":

| Scenario | Detection | Why it matters |
|---|---|---|
| Record is external | `PrimarySource = No` | Lot/site/dose usually missing — might not satisfy a school/employer form that requires them |
| Record predates HealthEx sync | `LastUpdated` older than current date | Records may be stale; prompt a reconnect |
| Two records for same date + same CVX | Dedup key: `(OccurrenceDate, CVX)` | Common import artifact |
| Missing CVX | `CVX` column empty | Can't map to schedule; show as "unclassified" |
| Unknown manufacturer for COVID | `Manufacturer` empty + `CVX in {208, 217, 309}` | Needed for boostering logic |
| Expired lot number | `ExpirationDate < OccurrenceDate` | Indicates admin error or data entry error — flag for review |

### 5.4 Titers live in `get_labs`, not `get_immunizations`

An immunization skill that answers "do I have MMR immunity?" or "do I need a flu shot?" often needs titer results, which are labs. Relevant LOINC codes observed:

- `Measles IgG` — MMR immunity
- `Mumps Antibody IgG` — MMR immunity
- `Rubella Antibody IgG` — MMR immunity
- `Quantiferon Plus, IT` — TB exposure

Titer results typically carry values like `Immune`, `Non-immune`, `Indeterminate`. If you want to answer "do I need MMR booster?", join `get_immunizations` (CVX 03 records) with `get_labs` (Measles/Mumps/Rubella IgG titers).

---

## 6. Inference patterns for an immunization skill

### 6.1 Full-history-first, cache aggressively

Unlike labs or medications, an immunization answer almost always needs full lifetime history. Don't try to serve a partial answer off `get_health_summary`. **Page all the way back on the first call**, normalize to a row list, and cache by patient + query timestamp. Subsequent questions in the same session should hit the cache.

### 6.2 Age-aware schedule comparison

The skill needs:
1. Patient DOB (from `get_health_summary` → `PATIENT:` line)
2. Normalized vaccine list (CVX + date)
3. A reference schedule (CDC child + catch-up + adult)

Then compute for each antigen series:
- Doses received
- Doses required for current age
- Next dose due / overdue status
- Earliest eligibility date for next dose (many schedules have minimum intervals)

### 6.3 Travel/special-population workflows

If the user asks about travel vaccines, you'll need:
- Destination-specific CDC travel health recommendations (outside HealthEx; call `web_search` or bundle a static reference in the skill)
- Cross-reference against existing `get_immunizations` records
- Check `get_conditions` for immunosuppression (live vaccine contraindications)
- Check `get_allergies` for egg, gelatin, neomycin (influenza, MMR, varicella contraindications)

### 6.4 School/employer form generation

A common skill task: "generate my vaccine record for <form>". Quality requirements:
- Only `PrimarySource=Yes` records, or clearly flag external ones
- Include lot number, manufacturer, site, route — required on most forms
- Sorted by antigen, not by date
- Human-readable vaccine names (map CVX → preferred display name, don't use the drifting `Immunization` text)

### 6.5 Recall and safety

Given a known FDA recall (lot number X), scan all records with `LotNumber == X`. This is trivial once normalized but impossible without the tabular format's lot column. Don't rely on `get_health_summary` for this — it drops lot numbers.

### 6.6 Freshness check on every response

Call `update_and_check_recent_records` at skill entry. If `lastUpdated` is more than ~30 days old, warn the user and surface the `reconnectUrl`. An immunization skill reporting "you're missing a flu shot" when the data just isn't synced is worse than no answer.

---

## 7. Suggested skill architecture

```
immunizations/
├── SKILL.md                       # Triggers, when to use, core flow
├── scripts/
│   ├── parse_tabular.py           # Reverse dict compression + empty-cell inheritance
│   ├── parse_summary.py           # Parse get_health_summary blob
│   ├── parse_flat_fhir.py         # Parse search/search_clinical_notes dot-notation
│   ├── paginate.py                # Loop on "More data available: Yes"
│   ├── normalize_immunization.py  # Row → canonical dict with typed fields
│   └── schedule_compare.py        # CDC schedule diff against received doses
├── references/
│   ├── cvx_codes.md               # CVX → vaccine name + antigen group
│   ├── cdc_child_schedule.json    # Ages, doses, intervals
│   ├── cdc_adult_schedule.json
│   ├── contraindications.md       # Vaccine → contraindicated allergens/conditions
│   └── data_quality_flags.md      # PrimarySource, LastUpdated, dedup rules
└── assets/
    └── form_template.md           # Reusable format for school/employer forms
```

### 7.1 SKILL.md triggers to include

Your skill should fire when the user asks any of:

- "Am I up to date on my vaccines?"
- "When did I last get a <vaccine>?"
- "Do I need a <vaccine>?"
- "What vaccines do I need for travel to <country>?"
- "Generate my immunization record"
- "Was I given <lot number> / the recalled <vaccine>?"
- "Do I have immunity to <disease>?" (joins immunizations + titers)

### 7.2 Minimal SKILL.md flow

1. **Freshness check** — `update_and_check_recent_records`. Surface staleness to user if >30d.
2. **Full history pull** — `get_immunizations` with pagination loop. Cache.
3. **Context pulls** (only if question needs them):
   - `get_allergies` for contraindication questions
   - `get_conditions` for immunosuppression questions
   - `get_labs` with LOINC filters for titer/immunity questions
   - `get_health_summary` for DOB (or cache after first call)
4. **Normalize** to canonical row format keyed by CVX.
5. **Answer** using schedule references + the normalized list.

---

## 8. Gotchas and surprises

These came up during direct testing — save yourself the rediscovery:

1. **`search` `limit` parameter is a soft cap.** Requested 5, received 10. Budget for this.
2. **`search_clinical_notes` returns RTF-escaped content** for some notes — you'll see `{{Normal;} Title; }` style markup. Strip or render appropriately.
3. **`get_health_summary` labs are deduped by name** — only the most recent value per lab is shown. Historical trend analysis needs `get_labs`.
4. **`get_labs` has non-lab content mixed in** — "Clinical Information", "Case Report", "Disclaimer", "Alcohol Use History", "Smoking History". Filter by LOINC code presence if you only want numeric lab values.
5. **`get_vitals` blood pressure is a compound string**: `"Systolic blood pressure: 118, Diastolic blood pressure: 57"` — not two separate rows. Parse the string.
6. **Combination vaccines are a single row with a combined name.** E.g., "Meningococcal Conj (ACY, W-135), Diphtheria, MCV4P, (Menactra)". Your CVX map needs to handle these — they have a single CVX (114 in this case) that covers the combined antigens.
7. **Date fields use mixed formats.** `OccurrenceDate` can be `YYYY-MM-DD` OR `YYYY-MM-DDTHH:MM:SSZ` (ISO with time). Parse permissively.
8. **The `@` prefix in reference columns can collide with actor references in FHIR-flattened output.** In tabular format, `@1` is a dictionary lookup. In search format, `patient.reference is Patient/e...` uses no `@`, but dictionary-compressed tabular cells contain literal `@1`. Don't conflate parsers.

---

## 9. Quick reference: every tool at a glance

```
get_health_summary()           → one-shot snapshot, no params
get_immunizations(beforeDate?, years?)
get_conditions(beforeDate?, years?)
get_medications(beforeDate?, years?)
get_labs(beforeDate?, years?)
get_vitals(beforeDate?, years?, vitals?: ["Blood Pressure", "Heart Rate", ...])
get_procedures(beforeDate?, years?)
get_allergies(beforeDate?, years?)
get_visits(beforeDate?, years?)
search(query, limit?)          → flattened FHIR, no pagination, soft limit
search_clinical_notes(query? | encounterId?, beforeDate?, years?)
update_and_check_recent_records()  → {message, lastUpdated, reconnectUrl}
```

All paginated tools use the same `beforeDate`/`years` pattern and the same pagination block format. Build one pagination helper, reuse everywhere.

---

*Generated by direct schema exploration against a live HealthEx account. Schemas verified by calling each endpoint and inspecting the actual response format, not by reading docs.*