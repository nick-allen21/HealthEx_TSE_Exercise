# Skill Design Guide: Building for Public Self-Install Distribution

> **For the agent building this skill.** The goal is a skill that any Claude Pro or Max user can download from GitHub, upload to their own account, and have it Just Work. No configuration. No code editing. No "oh, you also need to change line 47 of the Python script." This document describes the skill-level design decisions that make that possible.

---

## 1. Why this matters

There is no skills marketplace on claude.ai. Distribution to Pro/Max users happens via:

1. User visits the GitHub repo
2. User downloads a ZIP
3. User opens Claude → Customize → Skills → + Create skill → uploads the ZIP
4. User enables the skill
5. User asks a question, expecting the skill to fire correctly the first time

Every design decision in the skill should optimize for step 5 working on the first try with a user the author has never met. That user:

- Does not read your code
- Does not read beyond the first screen of your README
- Has a different HealthEx data shape than you do
- Might not have the HealthEx MCP connected yet
- Might have connected it five minutes ago and expects current data
- Will blame the skill (not their records) if something looks wrong

The rest of this document is the skill-level design pattern that addresses each of those.

---

## 2. SKILL.md — the single most important file

### 2.1 Frontmatter

```yaml
---
name: immunization-gap-analysis
description: [see §2.2 below — this is the most important field]
version: 1.0.0
---
```

Keep `name` lowercase kebab-case. Keep it short. This is what shows up in the user's skill list.

Include a `version` so you can ship updates and users can tell what they have.

### 2.2 The description field — make it pushy

This field is the trigger. Claude reads every enabled skill's description and decides whether to load the rest of the skill. Claude has a documented tendency to **undertrigger** — not load skills when they would have been useful. The antidote is a description that lists concrete phrasings the user might actually say, including indirect ones.

**Bad description** (undertriggers):

> Analyzes immunization history and recommends vaccines.

**Good description** (triggers reliably):

> Analyzes the user's full immunization history from HealthEx, compares it against current CDC recommendations, identifies gaps, and proposes a corrective action plan. **Use this skill whenever the user mentions vaccines, shots, immunizations, boosters, being "up to date," titers, immunity, catch-up schedules, flu shots, COVID boosters, Tdap, MMR, HPV, travel vaccines, vaccines for a specific country or trip, school/employer vaccine forms, or asks any variant of "what vaccines do I need" — even if they do not explicitly ask for a 'gap analysis' or mention this skill by name.** Also use it when the user asks about a specific vaccine by date ("when did I last get X?"), asks whether they are immune to a specific disease, or asks whether a vaccine lot was recalled.

Pattern: **what it does + when to use it + specific trigger phrases + "even if they don't ask for X explicitly."**

### 2.3 SKILL.md body structure

Keep the body focused on *what Claude does*, not *what the skill does*. Use this skeleton:

```markdown
# Immunization Gap Analysis

## When to use
[one paragraph reinforcing the description]

## Prerequisites this skill assumes
[see §3]

## Required entry checks
[see §4 — freshness gate]

## Workflow
1. Pull full immunization history (paginate fully; see scripts/paginate.py)
2. Pull DOB from get_health_summary if not cached
3. Pull context as needed (allergies, conditions) for contraindication checks
4. Normalize to canonical records keyed by CVX (scripts/normalize.py)
5. Compare against the CDC schedule reference (references/cdc_schedule.json)
6. Classify each antigen: up-to-date / due / overdue / unknown
7. Produce a plan with the required disclaimers (see §7)

## Required disclaimers on every answer
[see §7 — exact wording]

## Known limitations the skill must surface
[see §6]
```

Move all script logic into `scripts/`. Move reference data into `references/`. SKILL.md should be readable in under two minutes.

---

## 3. Prerequisite handling — assume nothing, check early

The skill has three external prerequisites the user may or may not have satisfied:

1. **HealthEx MCP connector is installed and authenticated**
2. **Records have been synced recently**
3. **The user has actually given data access** (some connectors install but need enrollment)

Do **not** write the skill as if these are guaranteed. Early in the workflow, call `HealthEx:update_and_check_recent_records`. Three branches:

| Condition | Skill behavior |
|---|---|
| Tool call fails / tool not available | Tell the user the HealthEx connector isn't connected. Give the exact Claude UI path (Settings → Connectors → HealthEx). Do not attempt analysis. |
| Tool succeeds but `lastUpdated` > 30 days ago | Warn prominently. Offer the `reconnectUrl`. Continue, but caveat every finding with "based on records last synced on YYYY-MM-DD." |
| Tool succeeds and data is fresh | Proceed silently; note the sync date in the final output. |

The skill must not silently produce a "you're missing a flu shot" answer when the real answer is "your records haven't synced in six months." That's the single most dangerous failure mode.

---

## 4. The freshness gate — make it the first step

Add to SKILL.md body:

```markdown
## Required entry checks (always run first)

Before any analysis, call `HealthEx:update_and_check_recent_records` and branch:
- If the call fails, respond: "I need the HealthEx connector to be installed and connected to analyze your immunizations. You can connect it at Settings → Connectors → HealthEx. Once connected, ask me again."
- If `lastUpdated` is more than 30 days old, lead the response with: "Note: your health records were last synced on {lastUpdated}. If you've had vaccines since then, they may not appear here. You can refresh at {reconnectUrl}."
- Always include the sync date in the final output so the user can judge freshness.
```

This keeps the decision logic out of scripts (where it's invisible to the user) and in the SKILL.md (where any Claude instance running the skill will see and follow it).

---

## 5. Graceful degradation — handle every missing field

HealthEx records are inconsistent. Externally reconciled records (`PrimarySource = No`) often lack lot numbers, dose, site, and sometimes even CVX codes. The skill must handle these without crashing or silently dropping them.

Rules for the normalizer (`scripts/normalize.py`):

- **Missing CVX** → assign category `unclassified`, do not use for schedule math, surface to the user as "I saw a record I couldn't classify: {name}, {date}."
- **Missing date** → drop the record, log to an internal "skipped" list surfaced at the end of the analysis.
- **Missing primary source flag** → assume `No` and flag as low-confidence.
- **Duplicate (same CVX + same date)** → dedupe keeping the primary-source record if one exists; otherwise keep one, note the duplicate.
- **Record with CVX that's not in the reference schedule** → surface as "administered but not part of standard recommendations" (e.g., travel vaccines like typhoid).

The skill should never say "you are fully up to date" without qualifying with what records it could and could not parse. A one-line footer like "Analysis based on 38 classified records; 2 records could not be classified." builds the trust needed for a medical use case.

---

## 6. Explicit limitations — put them in the output

Every final answer should acknowledge (in 1-2 sentences, not a wall of text):

- Records only reflect vaccines administered at HealthEx-connected health systems. Pharmacy clinics, travel clinics, military, and overseas vaccines may be missing.
- CDC schedules change. The skill uses a specific schedule version (surface the date).
- This is record analysis, not medical advice.

Bake this into SKILL.md as a required closing paragraph, not as an optional addition:

```markdown
## Required closing on every substantive answer

End every immunization analysis with:

> **A few things to keep in mind:** This analysis only includes vaccines in your HealthEx-connected records — shots given at pharmacies, travel clinics, or outside this health system may not appear. CDC recommendations are based on the schedule as of {schedule_version_date}. This is a summary of your records, not medical advice; confirm any gaps with your clinician before acting.
```

Putting this in SKILL.md rather than appending it in a Python script ensures it survives even if a future user modifies the scripts.

---

## 7. Source-citing — bundle reference data, don't hallucinate schedules

Do not ask Claude to recall the CDC schedule from training data. Bundle it.

Create `references/cdc_adult_schedule.json` and `references/cdc_child_schedule.json` with a clear provenance header:

```json
{
  "source": "CDC Recommended Adult Immunization Schedule",
  "source_url": "https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html",
  "version_date": "2026-01-15",
  "retrieved": "2026-04-21",
  "notes": "Snapshot of CDC schedule at time of skill authoring. Check source URL for updates.",
  "schedule": [
    {
      "antigen": "Influenza",
      "cvx_codes": [140, 150, 155, 158, 161, 166, 168, 171, 185, 186, 197, 205],
      "recommendation": "annual",
      "ages": "6 months and older"
    },
    {
      "antigen": "Tdap/Td",
      "cvx_codes": [115, 138, 139],
      "recommendation": "booster every 10 years",
      "ages": "19 and older"
    }
    // ... etc
  ]
}
```

In the final output, cite the schedule version:

> "Based on the CDC adult schedule (version 2026-01-15), you are due for..."

Also cite the CDC source URL. A user who wants to double-check can. A user who wants to trust the skill can.

### European equivalent

The brief mentions "CDC or European equivalent." Bundle both. Add a `references/ecdc_schedule.json` with the same structure from the [ECDC Vaccine Scheduler](https://vaccine-schedule.ecdc.europa.eu/). The SKILL.md should pick based on user context — if the user mentions Europe, travel to Europe, or a European country of residence, prefer ECDC; otherwise default to CDC. A simple heuristic in SKILL.md text is enough; don't overengineer.

---

## 8. Script portability — Python stdlib, no pip installs

Users won't run `pip install` before uploading. Assume the skill runs in Claude's code execution environment, which has a standard set of libraries. Design constraints:

- Use Python standard library only for anything the skill requires to function
- If you want fancier analysis (pandas, matplotlib), make it optional and degrade gracefully
- No network calls from skill scripts (other than via the HealthEx MCP tools Claude already has)
- No file paths that assume a specific working directory — always resolve relative to the skill folder

Parser for the HealthEx tabular format (`scripts/parse_tabular.py`) can be written in ~80 lines of stdlib Python. See the separate HealthEx API reference doc for the format spec.

---

## 9. Versioning — so users know what they have

Put a version in three places:

1. `SKILL.md` frontmatter (`version: 1.0.0`)
2. `references/cdc_adult_schedule.json` (`version_date`)
3. A `CHANGELOG.md` at the skill folder root

When you update the CDC schedule or fix a bug, bump the version and update the changelog. Users who re-download can tell what changed.

Include the skill version in the final output footer:

> "immunization-gap-analysis v1.0.0 · CDC schedule 2026-01-15"

---

## 10. Directory layout at the skill level

```
immunization-gap-analysis/            ← this folder is what gets zipped
├── SKILL.md
├── CHANGELOG.md
├── scripts/
│   ├── parse_tabular.py              ← decompress dict-format into row list
│   ├── paginate.py                   ← loop on "More data available: Yes"
│   ├── normalize.py                  ← row → canonical dict keyed by CVX
│   ├── compare_schedule.py           ← gap analysis vs. reference schedule
│   └── format_output.py              ← assemble plan + required disclaimers
├── references/
│   ├── cvx_codes.json                ← CVX → antigen group + display name
│   ├── cdc_adult_schedule.json
│   ├── cdc_child_schedule.json
│   ├── ecdc_schedule.json
│   ├── contraindications.json        ← antigen → allergens/conditions
│   └── data_quality_flags.md         ← human-readable reference for the LLM
└── assets/
    └── form_template.md              ← optional: school/employer form format
```

The **skill folder itself** (not its contents) is what should be zipped. When Claude unpacks the ZIP it expects to find a folder containing SKILL.md, not a loose SKILL.md at the ZIP root.

---

## 11. The repo wrapper (outside the skill folder)

The skill folder above lives inside a GitHub repo with this structure:

```
<repo-root>/
├── README.md                         ← install instructions, screenshots, prereqs
├── LICENSE                           ← MIT or Apache-2.0
├── immunization-gap-analysis/        ← the skill folder (§10)
├── releases/
│   └── immunization-gap-analysis-v1.0.0.zip  ← pre-packaged
└── docs/
    └── medical-disclaimer.md
```

The README must cover, in this order:

1. **One-sentence value prop.** "Analyze your immunization records against CDC/ECDC recommendations and get a corrective-action plan, powered by your HealthEx data."
2. **Prerequisites checklist** (Pro/Max, code execution enabled, HealthEx MCP connected and authenticated)
3. **Install steps** (3 max): download ZIP → Customize → Skills → + Create skill → upload → enable
4. **Example prompts** ("Am I up to date on my vaccines?", "What do I need for travel to Kenya?", "When did I last get a Tdap?")
5. **Screenshot of a real output** (redact personal data)
6. **Medical disclaimer** (one paragraph)
7. **Limitations** (what the skill can and can't see)
8. **Changelog link**

Do not put anything above the prereqs checklist that makes a first-time user think "this looks hard." Every sentence before "here's how to install" is a chance for the user to close the tab.

---

## 12. Pre-publish checklist

Before pushing the repo public, run through this:

- [ ] SKILL.md description is explicitly pushy (§2.2) and names 5+ trigger phrases
- [ ] SKILL.md instructs the freshness gate as step zero
- [ ] SKILL.md instructs the required closing disclaimer on every substantive answer
- [ ] Reference schedules carry a `version_date` and `source_url`
- [ ] Scripts are stdlib-only, no network calls
- [ ] Normalizer handles every missing-field case without crashing
- [ ] Skill produces a correct answer on a known test case (your own HealthEx data, or a fixture)
- [ ] Skill produces a correct answer when HealthEx is disconnected (clear error, no crash)
- [ ] Skill produces a correct answer when `lastUpdated` is stale (warns, proceeds)
- [ ] Final output footer includes skill version + schedule version + sync date
- [ ] README prereqs section comes before install steps
- [ ] Pre-built ZIP is attached to the release tag, not just the source
- [ ] License file is present
- [ ] CHANGELOG.md exists even if it only has one entry

If any box is unchecked, the skill is not ready for strangers.

---

## 13. After publishing

- Tag releases (`v1.0.0`) so users can pin to a version
- Watch the issues tab; medical-context feedback is disproportionately valuable
- When CDC updates the schedule, bump a patch version and update `cdc_adult_schedule.json`
- Keep the description field in sync with the README — if you add a capability, name it in the description so it triggers

---

*This guide is specific to building the immunization-gap-analysis skill for self-install distribution. It is not a general skill authoring tutorial — for that, see Anthropic's skill-creator skill and the Complete Guide to Building Skills for Claude.*