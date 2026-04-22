# The Complete Guide to Building Skills for Claude

## Contents

- [Introduction](#introduction)
- [Fundamentals](#chapter-1-fundamentals)
- [Planning and design](#chapter-2-planning-and-design)
- [Testing and iteration](#chapter-3-testing-and-iteration)
- [Distribution and sharing](#chapter-4-distribution-and-sharing)
- [Patterns and troubleshooting](#chapter-5-patterns-and-troubleshooting)
- [Resources and references](#chapter-6-resources-and-references)

---

## Introduction

A skill is a set of instructions - packaged as a simple folder - that teaches Claude how to handle specific tasks or workflows. Skills are one of the most powerful ways to customize Claude for your specific needs. Instead of re-explaining your preferences, processes, and domain expertise in every conversation, skills let you teach Claude once and benefit every time.

Skills are powerful when you have repeatable workflows: generating frontend designs from specs, conducting research with consistent methodology, creating documents that follow your team's style guide, or orchestrating multi-step processes. They work well with Claude's built-in capabilities like code execution and document creation. For those building MCP integrations, skills add another powerful layer helping turn raw tool access into reliable, optimized workflows.

This guide covers everything you need to know to build effective skills - from planning and structure to testing and distribution. Whether you're building a skill for yourself, your team, or for the community, you'll find practical patterns and real-world examples throughout.

### What you'll learn

- Technical requirements and best practices for skill structure
- Patterns for standalone skills and MCP-enhanced workflows
- Patterns we've seen work well across different use cases
- How to test, iterate, and distribute your skills

### Who this is for

- Developers who want Claude to follow specific workflows consistently
- Power users who want Claude to follow specific workflows
- Teams looking to standardize how Claude works across their organization

### Two Paths Through This Guide

Building standalone skills? Focus on Fundamentals, Planning and Design, and category 1-2. Enhancing an MCP integration? The "Skills + MCP" section and category 3 are for you. Both paths share the same technical requirements, but you choose what's relevant to your use case.

### What you'll get out of this guide

By the end, you'll be able to build a functional skill in a single sitting. Expect about 15-30 minutes to build and test your first working skill using the skill-creator.

Let's get started.

---

# Chapter 1: Fundamentals

## What is a skill?

A skill is a folder containing:

- `SKILL.md` (required): Instructions in Markdown with YAML frontmatter
- `scripts/` (optional): Executable code (Python, Bash, etc.)
- `references/` (optional): Documentation loaded as needed
- `assets/` (optional): Templates, fonts, icons used in output

## Core design principles

### Progressive Disclosure

Skills use a three-level system:

- **First level (YAML frontmatter):** Always loaded in Claude's system prompt. Provides just enough information for Claude to know when each skill should be used without loading all of it into context.
- **Second level (SKILL.md body):** Loaded when Claude thinks the skill is relevant to the current task. Contains the full instructions and guidance.
- **Third level (Linked files):** Additional files bundled within the skill directory that Claude can choose to navigate and discover only as needed.

This progressive disclosure minimizes token usage while maintaining specialized expertise.

### Composability

Claude can load multiple skills simultaneously. Your skill should work well alongside others, not assume it's the only capability available.

### Portability

Skills work identically across Claude.ai, Claude Code, and API. Create a skill once and it works across all surfaces without modification, provided the environment supports any dependencies the skill requires.

## For MCP Builders: Skills + Connectors

Building standalone skills without MCP? Skip to Planning and Design - you can always return here later.

If you already have a working MCP server, you've done the hard part. Skills are the knowledge layer on top - capturing the workflows and best practices you already know, so Claude can apply them consistently.

### The kitchen analogy

- **MCP** provides the professional kitchen: access to tools, ingredients, and equipment.
- **Skills** provide the recipes: step-by-step instructions on how to create something valuable.

Together, they enable users to accomplish complex tasks without needing to figure out every step themselves.

### How they work together

| MCP (Connectivity) | Skills (Knowledge) |
|---|---|
| Connects Claude to your service (Notion, Asana, Linear, etc.) | Teaches Claude how to use your service effectively |
| Provides real-time data access and tool invocation | Captures workflows and best practices |
| What Claude can do | How Claude should do it |

### Why this matters for your MCP users

#### Without skills

- Users connect your MCP but don't know what to do next
- Support tickets asking "how do I do X with your integration"
- Each conversation starts from scratch
- Inconsistent results because users prompt differently each time
- Users blame your connector when the real issue is workflow guidance

#### With skills

- Pre-built workflows activate automatically when needed
- Consistent, reliable tool usage
- Best practices embedded in every interaction
- Lower learning curve for your integration

---

# Chapter 2: Planning and design

## Start with use cases

Before writing any code, identify 2-3 concrete use cases your skill should enable.

### Good use case definition

**Use Case:** Project Sprint Planning

**Trigger:** User says "help me plan this sprint" or "create sprint tasks"

**Steps:**
1. Fetch current project status from Linear (via MCP)
2. Analyze team velocity and capacity
3. Suggest task prioritization
4. Create tasks in Linear with proper labels and estimates

**Result:** Fully planned sprint with tasks created

### Ask yourself

- What does a user want to accomplish?
- What multi-step workflows does this require?
- Which tools are needed (built-in or MCP?)
- What domain knowledge or best practices should be embedded?

## Common skill use case categories

At Anthropic, we've observed three common use cases:

### Category 1: Document & Asset Creation

**Used for:** Creating consistent, high-quality output including documents, presentations, apps, designs, code, etc.

**Real example:** `frontend-design` skill (also see skills for docx, pptx, xlsx, and ppt)

> "Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, artifacts, posters, or applications."

**Key techniques:**
- Embedded style guides and brand standards
- Template structures for consistent output
- Quality checklists before finalizing
- No external tools required - uses Claude's built-in capabilities

### Category 2: Workflow Automation

**Used for:** Multi-step processes that benefit from consistent methodology, including coordination across multiple MCP servers.

**Real example:** `skill-creator` skill

> "Interactive guide for creating new skills. Walks the user through use case definition, frontmatter generation, instruction writing, and validation."

**Key techniques:**
- Step-by-step workflow with validation gates
- Templates for common structures
- Built-in review and improvement suggestions
- Iterative refinement loops

### Category 3: MCP Enhancement

**Used for:** Workflow guidance to enhance the tool access an MCP server provides.

**Real example:** `sentry-code-review` skill (from Sentry)

> "Automatically analyzes and fixes detected bugs in GitHub Pull Requests using Sentry's error monitoring data via their MCP server."

**Key techniques:**
- Coordinates multiple MCP calls in sequence
- Embeds domain expertise
- Provides context users would otherwise need to specify
- Error handling for common MCP issues

## Define success criteria

How will you know your skill is working?

These are aspirational targets - rough benchmarks rather than precise thresholds. Aim for rigor but accept that there will be an element of vibes-based assessment. We are actively developing more robust measurement guidance and tooling.

### Quantitative metrics

- **Skill triggers on 90% of relevant queries**
  - How to measure: Run 10-20 test queries that should trigger your skill. Track how many times it loads automatically vs. requires explicit invocation.
- **Completes workflow in X tool calls**
  - How to measure: Compare the same task with and without the skill enabled. Count tool calls and total tokens consumed.
- **0 failed API calls per workflow**
  - How to measure: Monitor MCP server logs during test runs. Track retry rates and error codes.

### Qualitative metrics

- **Users don't need to prompt Claude about next steps**
  - How to assess: During testing, note how often you need to redirect or clarify. Ask beta users for feedback.
- **Workflows complete without user correction**
  - How to assess: Run the same request 3-5 times. Compare outputs for structural consistency and quality.
- **Consistent results across sessions**
  - How to assess: Can a new user accomplish the task on first try with minimal guidance?

## Technical requirements

### File structure

```text
your-skill-name/
├── SKILL.md # Required - main skill file
├── scripts/ # Optional - executable code
│   ├── process_data.py # Example
│   └── validate.sh # Example
├── references/ # Optional - documentation
│   ├── api-guide.md # Example
│   └── examples/ # Example
└── assets/ # Optional - templates, etc.
    └── report-template.md # Example