# Document Feature

Generate complete developer and user documentation for a named feature in this expense tracker project.

## Input
Feature name: $ARGUMENTS

## Your Task

### Step 1 — Discover the feature code

Search the codebase for all files related to `$ARGUMENTS`:
- Grep `src/` for the feature name and camelCase/kebab-case variants
- Check all branches (`git branch -a`) — this project has feature-data-export-v1/v2/v3
- Read the relevant file sections in full

### Step 2 — Classify the feature

Determine layer(s):
- **Frontend only** — React components, UI state, Tailwind, browser APIs (Blob, localStorage)
- **Backend only** — API routes, server actions, DB queries
- **Full-stack** — both layers

Adjust depth: frontend = component tree + state; backend = route signatures + schema; full-stack = both + the contract between them.

### Step 3 — Developer Documentation

Write to `docs/dev/<kebab-case-feature>.md` with these sections:
1. Header: feature name, layer, branches, date
2. Overview: one paragraph — what it does and why
3. Architecture: ASCII component or data-flow diagram
4. Files & Entry Points: table of every involved file and its role
5. Key Types: verbatim TypeScript types from the source
6. Core Implementation: per function/component — signature, inputs, outputs/side-effects, gotchas
7. State Management: what state, where it lives, how it flows
8. Data Flow: step-by-step trace of a typical user action
9. Error Handling & Edge Cases: what is handled and what is not
10. Security: XSS, injection, privacy notes
11. Performance: memoization, lazy loading, bottlenecks
12. Testing: what to unit-test, integration-test, current coverage gaps
13. Related Docs: link to user guide + other related dev docs

### Step 4 — User Documentation

Write to `docs/user/<kebab-case-feature>.md` with these sections:
1. Title: "How to Use [Feature Name]"
2. Metadata: which app version(s), difficulty level (Beginner/Intermediate)
3. Notice: `> Screenshots pending — see SCREENSHOT comments` if no browser tool
4. What is it?: one plain-English sentence, no jargon
5. Before You Start: prerequisites
6. Step-by-Step Guide: each step followed by a SCREENSHOT comment and image placeholder
7. Tips & Tricks: power-user shortcuts
8. Troubleshooting: table — Problem | Solution
9. FAQ: Q&A for common questions
10. Related Guides: link to developer reference + related user docs

### Step 5 — Screenshots (bonus)

If a browser automation tool is available: navigate to https://expense-tracker-course.vercel.app,
walk the feature flow, capture each step, save to docs/user/screenshots/, replace placeholders
with real image tags.

If not: leave SCREENSHOT comments in place as instructions for a human.

### Step 6 — Cross-reference existing docs

1. Scan docs/dev/ and docs/user/ for related existing docs
2. Add Related Documentation links in both new files
3. Add reciprocal links in existing docs pointing back

### Step 7 — Report back

Confirm: file paths created, layer classification, number of source files analyzed,
screenshot status, cross-references added.
