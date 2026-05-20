# Contributing Guide (Spec-Driven Development)

Repo: `Louie-RP/3D-Shines`

This project uses **Spec-Driven Development (SDD)**. Every meaningful change must be backed by a spec in `/specs`.

---

## 1) The SDD Rule (non-negotiable)
**No spec = no build.**

Before writing code for a feature, you must:
1. Create or update a spec in `/specs/`
2. Fill in:
   - Outcomes & Objectives
   - Scope & Boundaries
   - Architectural Constraints
   - Implementation Plan
   - Verification Criteria
3. Only then start coding.

---

## 2) Workflow Overview

### A) Start a feature
1. Create a new spec file:
   - `specs/YYYY-MM-DD-<feature-name>.md`
2. If this work is part of an existing spec, update that spec instead.
3. In the spec, write:
   - **exact files** to change
   - **step-by-step plan**
   - **must-pass verification checklist**

### B) Implement (Step-by-step)
Implement **one step at a time** from the spec.
- Do not jump ahead.
- Do not add “nice-to-have” extras.

### C) Verify
Before opening a PR:
- Run the “Must-pass” scenarios in the spec.
- Check off each item.

### D) Submit PR
- Link the spec.
- Include verification evidence (notes or screenshots if needed).

---

## 3) Repo Conventions

### Specs
- Specs live in `/specs/`.
- Use `SPEC_TEMPLATE.md` for new specs.
- Specs must be written so a new contributor could follow them without guessing.

### Decisions
- Architecture decisions live in `/docs/DECISIONS.md`.
- If you make a new architectural choice, update `DECISIONS.md` in the same PR.

### Minimal changes
- Keep changes tight. Don’t refactor unrelated files.
- If a refactor is needed, write a separate spec.

---

## 4) Copilot Usage (How we keep it aligned)

When using Copilot Chat, always start with:

```
Follow this spec exactly: /specs/<spec-file>.md

Rules:
- Do not implement anything out-of-scope.
- Before writing code, list the exact files you will change/add.
- After writing code, map each change back to the spec section it satisfies.
- After changes, provide a checklist showing which Verification Criteria items are satisfied and how to test them.
- If anything is unclear, propose the smallest assumption and call it out explicitly.
```
### Guardrails
- If Copilot suggests extra features outside spec → reject and restate scope.
- If Copilot changes many files not listed in plan → stop and re-scope.

---

## 5) Branch + Commit Guidelines

### Branch naming
- `feat/<short-name>`
- `fix/<short-name>`
- `chore/<short-name>`

### Commit messages
Format:
- `feat: <message>`
- `fix: <message>`
- `chore: <message>`
- `docs: <message>`

---

## 6) Definition of Done (DoD)
A feature is “done” only when:
- [ ] Spec exists and is complete
- [ ] Implementation matches spec scope (no out-of-scope additions)
- [ ] All “Verification Criteria (Must-pass)” items are checked off
- [ ] Security constraints are met:
  - [ ] No secrets in frontend
  - [ ] CORS restricted properly
  - [ ] Webhook signature verification enforced
  - [ ] Price tampering blocked (server validates `priceId`)
- [ ] `docs/DECISIONS.md` updated if a decision changed

---

## 7) Local Development Notes (Expected)
This repo has:
- Static frontend (GitHub Pages)
- Cloudflare Worker backend (in `/worker/`)
- D1 database for orders

### Local frontend
- Use any static server (example):
  - `python -m http.server 5173`
- Update Worker CORS to allow `http://localhost:5173` in dev.

### Worker development
- Use Wrangler dev mode:
  - `wrangler dev`
- Secrets should be set using `wrangler secret put ...` (never commit secrets).

---

## 8) Release Checklist (minimum)
Before deploying:
- [ ] Stripe test mode E2E checkout completed successfully
- [ ] Webhook verified and writes to D1
- [ ] `GET /products` caching enabled
- [ ] Production CORS origin matches exactly
- [ ] Live keys switched only after successful testing
