# docs/

This folder is the project memory. It is how I tracked progress and coordinated
context across multiple AI coding agents while building the HealthEx exercise.

The top-level `README.md` is the reviewer-facing entry point. These docs are
the execution surface behind it.

## How The Multi-Agent Workflow Worked

I used a strict 1:1 mapping per working session:

- 1 agent
- 1 phase document
- 1 implementation TODO
- 1 branch

Each agent was responsible for its assigned phase, read `implementation-plan.md`
and its phase doc first, kept both current as work progressed, and left clean
handoff notes so the next agent could continue without re-discovering context.

`agent-readme.md` is the operating contract. `implementation-plan.md` is the
living technical source of truth (decisions, open questions, master TODOs).
The `phase1..phase6` docs are the handoff surfaces for each unit of work.

## Navigation

### Operating context

- [agent-readme.md](agent-readme.md) — operating rules for any agent working in this repo
- [implementation-plan.md](implementation-plan.md) — living decisions, scope, validated findings, master TODOs
- [medical-disclaimer.md](medical-disclaimer.md) — non-clinical-advice disclaimer shipped with the skill

### Phase execution

- [phase1_foundation.md](phase1_foundation.md) — HealthEx access and retrieval foundation
- [phase2_fhir_queries_shaping.md](phase2_fhir_queries_shaping.md) — FHIR `$everything` query shape and bundle shaping handoff
- [phase3_clinical_history_ui.md](phase3_clinical_history_ui.md) — reviewer-facing chart UI, tabs, per-item expansion
- [phase4_claude_immunization_skill.md](phase4_claude_immunization_skill.md) — Claude skill, recommendation source, MCP workflow
- [phase5_extensions_validation.md](phase5_extensions_validation.md) — three API-side data-quality gap handlers, three unit tests, chart-as-chat extension
- [phase6_readme_submission.md](phase6_readme_submission.md) — reviewer-facing documentation and submission packaging

### Deeper technical notes

- [healthex-api-reference.md](healthex-api-reference.md) — HealthEx tool catalog, output formats, pagination quirks, CVX-vs-label reasoning (used as the knowledge base while designing the skill)
- [skill-feedback-1.md](skill-feedback-1.md) — live-run feedback notes on the v1.0.0 skill from a real HealthEx record, used to drive the v1.1.0 reliability pass

### Archive

Material I referenced while building but do not expect to need again:

- [archive/claude-skills-guide.md](archive/claude-skills-guide.md) — Anthropic's public guide to building Claude skills
- [archive/skill-distribution-guide.md](archive/skill-distribution-guide.md) — design notes on public self-install distribution (superseded by the shipped skill package)
