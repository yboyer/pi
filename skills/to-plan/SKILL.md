---
name: to-plan
description: Turn a plan, spec, or PRD into a project-root PLAN.md made of independently-grabbable vertical slices for a downstream implementation skill. Use when user wants to create a PLAN.md, convert planning material into executable sections, or prepare work for a TDD skill.
---

# To Plan

Turn a plan, spec, or PRD into a `PLAN.md` at the project root.

The output should be a practical handoff artifact for a downstream implementation skill. Prefer thin, end-to-end vertical slices over broad horizontal workstreams.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes an issue reference, URL, or path, fetch it and read the full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the system. Use the project's domain glossary vocabulary throughout the plan, and respect any ADRs in the area you are touching.

### 3. Draft vertical-slice sections

Break the source material into **tracer-bullet** plan sections. Each section should be a thin vertical slice that cuts through all relevant integration layers end-to-end, not a horizontal bucket of one layer.

Each section must be independently understandable and, where possible, independently executable by a downstream implementation skill.

<vertical-slice-rules>
- Each section delivers a narrow but complete path through the relevant layers
- A completed section is demoable or verifiable on its own
- Prefer many thin sections over a few thick sections
- Call out blockers explicitly when a section cannot start immediately
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each section, show:

- **Title**: short descriptive name
- **Blocked by**: which other sections (if any) must complete first
- **Outcome**: the user-visible or system-visible result of completing this section
- **Scope**: what is included in this section

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any sections be merged or split further?
- Is each section independently actionable enough for a downstream TDD skill?

Iterate until the user approves the breakdown.

### 5. Write PLAN.md

After approval, write `PLAN.md` at the project root. If `PLAN.md` already exists, update or overwrite it so the final file reflects the approved plan.

Use the template below.

<plan-template>
# PLAN

## Goal

A concise description of the end state this plan is driving toward.

## Assumptions

- Key assumptions that shape the plan

## Section 1: <short title>

### Outcome

Describe the end-to-end behavior or capability this section delivers.

### Scope

- What is included
- What this section intentionally leaves for later sections

### Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Blocked by

`None - can start immediately`

Or list the blocking sections.

### Implementation notes

Capture stable decisions, contracts, invariants, or integration expectations that a downstream TDD skill will need. Avoid specific file paths or code snippets unless a prototype encodes a decision more precisely than prose can.

## Section N: <short title>

Repeat the same structure for each additional section.
</plan-template>

## Writing rules

- Optimize for execution, not stakeholder presentation
- Avoid specific file paths unless they are required to disambiguate a stable architectural boundary
- Avoid code snippets unless they capture a durable decision better than prose
- Keep each section independently grabbable by a downstream implementation skill
- Do not create issue-tracker tickets as part of this workflow
