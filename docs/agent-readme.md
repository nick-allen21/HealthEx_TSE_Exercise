# Agent README

This file defines how agents should work in this repository.

## Purpose

Use this document as the operating guide for any agent assigned to work in the HealthEx exercise directory.

## Central Rule

Agents operate with a strict 1:1 mapping:

- 1 agent
- 1 implementation TODO
- 1 phase document
- 1 branch

If git worktrees are used, the branch name and the worktree name should be the same so parallel work stays easy to track across multiple Cursor windows.

## Core Rules

- Iteratively update documentation when needed. This includes this file, phase docs, and implementation plan. If user says anything that contradicts things in the current md files, then you should update. If there's anything the user says that other agents need to know, update that phase doc or if its repo level then agent readme & implementation plan. Make small focus edits instead of re-writing an entire file. 
- Write code that is succinct, clear, accurate, and not overly complicated.
- Use readable variable names and simple structure.
- Prefer simple one-line comments when a comment is needed.
- Do not over-structure comments or add commentary that repeats the code.
- Add brief comments only where the logic is not self-evident.
- Treat code quality as if the work were going into a real PR.
- Commit frequently with robust commit messages that explain why the change was made.
- Make very small iterative changes, then wait for review before taking on the next task.
- Do one task at a time so each change can be validated cleanly.
- When a phase depends on external API investigation, prefer continuity: the same agent who investigates the API should carry the first implementation pass when possible.

## Phase Ownership

- Each agent is assigned to one phase of the project.
- Each agent is responsible for understanding the domain and technical context needed for its phase.
- Agents should stay focused on their assigned phase unless explicitly asked to coordinate across phases.

## Expected Workflow

- Read `docs/implementation-plan.md` before starting work.
- Read the phase document you are responsible for before starting work.
- An agent should be able to read `docs/implementation-plan.md` and its assigned phase document and become fully up to date.
- Bootstrap the local environment before implementation work if dependencies are needed:
  ```bash
  conda env create -f environment.yml
  conda activate healthex-tse
  npm install
  npm run dev
  ```
- If the Cursor-integrated shell resolves `node` or `npm` to Cursor's bundled runtime instead of the active Conda environment, prefer the env-local binary directly for validation commands.
- Check the relevant TODOs, assumptions, and open decisions before making changes.
- Update `docs/implementation-plan.md` as work progresses so it always reflects the current state of the project.
- Update the phase document you are responsible for as work progresses.
- Record important design decisions, TODO status updates, and scope changes as they happen.
- Keep the work simple, practical, and aligned with the HealthEx assignment.

## Shared Repository Memory

- Treat `docs/implementation-plan.md` as the living technical source of truth.
- Treat the assigned phase document as the execution and handoff surface for that unit of work.
- Treat `README.md` as the human-facing entry point for reviewers.
- Keep both the implementation plan and the assigned phase document current enough that the next agent can continue immediately. The docs should accurately reflect the current state of the world. A agent should be able to read them and and be an expert in this directory.

## Handoffs

- Leave clean notes when your work changes assumptions, scope, or shared technical direction.
- Flag open questions instead of silently making large product or architecture decisions.
- Make it easy for the next agent to continue without re-discovering context.
