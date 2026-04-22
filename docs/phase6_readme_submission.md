## Phase 6 README And Submission

## Purpose

Phase 6 turns the technical work into a reviewer-friendly submission package.

## Deliverables

- final setup and run instructions
- a concise explanation of tradeoffs and known limitations
- a short note on what would be done differently with more time
- links to deeper technical docs only where they genuinely help the reviewer

## Current Submission Shape

The current submission package has two reviewer-facing surfaces:

- the top-level [../README.md](../README.md), which is now the primary human
  entry point for setup, architecture, tradeoffs, testing, and repo navigation
- the prebuilt public Claude skill ZIP at
  `releases/immunization-gap-analysis-v1.1.0.zip`, which can be uploaded
  directly into Claude

The README is intentionally written for a reviewer who may only spend a few
minutes in the repository before deciding whether the technical work is
coherent.

## What The README Now Covers

- prerequisites and install steps for the public Claude skill
- example prompts and an example output excerpt
- the medical disclaimer and the major limitations of record-based vaccine-gap
  review
- repo structure and where to inspect the web app, skill package, and phase docs
- local setup and run instructions for the Next.js app
- the current browser-token retrieval flow and its limitations
- the current Claude skill behavior, including the orchestrated runtime path and
  the remaining formatting caveat from live testing
- focused technical notes, data-quality findings, test instructions, tradeoffs,
  and "with more time" notes

## Reviewer Flow

If the reviewer wants the shortest credible path through the submission, the
recommended order is:

1. read [../README.md](../README.md)
2. open the running web app or inspect `src/components/live-healthex-viewer.tsx`
3. inspect `claude-skills/healthex-immunization-gap/SKILL.md`
4. inspect `claude-skills/healthex-immunization-gap/references/`
5. upload `releases/immunization-gap-analysis-v1.1.0.zip` into Claude for a
   live skill test

## Remaining Submission Risks

- the main repo docs are current, but the uploaded Claude skill still depends on
  live connector behavior outside the local repo
- the immunization logic is credible and substantially complete for submission,
  but some narrow live answers still need formatting polish
- browser-token FHIR access and Claude HealthEx connector access remain related
  but distinct workflows, so reviewers need to keep those two paths separate
