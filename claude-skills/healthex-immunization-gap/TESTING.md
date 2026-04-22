# Testing Guide

Use this guide for the next live HealthEx runs and for lightweight local
regression checks.

## Live Prompt Matrix

Test one behavior at a time before re-running the broad headline prompt.

### Core prompts

- `Am I up to date on my vaccines?`
- `What shots or boosters should I ask my clinician about next?`
- `When did I last get a Tdap?`
- `Do I appear immune to measles?`

### Coverage prompts

- `Do my records show I completed the HPV series?`
- `Do my records show I completed hepatitis B?`
- `Do I have evidence of meningococcal coverage from adolescence?`
- `Are any of my childhood vaccines missing from the record, or does it look like the series was completed?`

### Data-quality prompts

- `Which vaccines in my history are primary-source versus imported from outside records?`
- `Are there any vaccines in my record that you could not classify confidently?`
- `What records did you skip or treat as lower confidence?`

### Failure-mode prompts

- with HealthEx disconnected: `Am I up to date on my vaccines?`
- with stale sync state: `What vaccines do I need right now?`
- narrow recency question: `When did I last get a flu shot?`

### Narration-leakage prompts

- `Am I up to date on my vaccines? Reply only in the standard numbered sections and footer.`
- `What shots should I ask my clinician about next? Do not include tool details, retries, or execution notes.`
- `When did I last get a Tdap? Include the standard disclaimer and footer exactly once.`

## What To Inspect In Every Live Run

- did the skill trigger automatically
- did the freshness warning appear at the top when needed
- did the skill clearly state whether it used a full or shallow history pull
- were corrective actions concrete
- did the answer overuse `unable to determine` or `context required`
- were older records without CVX still credited when the display name was clear
- did the footer show skill version, schedule version, and sync date
- did the answer start directly at section 1 with no extra lead-in
- was there only one substantive answer block
- did the answer avoid tool names like `get_immunizations`, `search`, `tool call`,
  or retry commentary unless the request truly failed
- did the disclaimer appear once
- did the footer appear once

## Issue Triage Loop

After every live run:

1. save the prompt
2. save the full raw output
3. write one sentence about what felt wrong
4. classify the issue into one bucket:
   - orchestration/runtime
   - schedule coverage
   - normalization/CVX mapping
   - titer handling
   - output formatting
   - trigger behavior
   - narration leakage
5. fix only one bucket at a time
6. re-run the smallest prompt that proves the fix
7. only then re-run `Am I up to date on my vaccines?`

## Local Fixture Checks

Use the fixtures under `tests/fixtures/` to smoke-test the packaged pipeline:

- `adult_complete_childhood_series.json`
- `display_name_only_records.json`
- `adult_external_recent_history.json`

Run:

```bash
python3 "claude-skills/healthex-immunization-gap/tests/run_smoke_tests.py"
```

These are not a full clinical test suite. They are regression guards for the
most recent feedback-driven fixes.
