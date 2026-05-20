# Spec: <Feature Name>
Date: <YYYY-MM-DD>
Owner: <Name>
Status: Draft | In Progress | Done

## 1) Outcomes & Objectives
**Business outcome**
- <What value does this add?>

**Success definition (must be measurable)**
- [ ] <Observable success condition 1>
- [ ] <Observable success condition 2>

## 2) Scope & Boundaries
### In Scope
- <Bullet list of included work>

### Out of Scope
- <Explicitly list exclusions>

### Non-goals
- <Nice-to-haves NOT included>

## 3) Users & Flows
### Primary user story
- As a <user>, I want <goal>, so that <benefit>.

### Flow summary
1. <Step 1>
2. <Step 2>
3. <Step 3>

## 4) Architectural Constraints (Non-negotiables)
- Hosting:
  - Frontend: <...>
  - Backend: <...>
- Security:
  - [ ] No secrets in frontend
  - [ ] CORS restricted to known origin(s)
- Dependencies:
  - <Allowed/disallowed dependencies>
- Data:
  - <Where data is stored (or not stored)>
- Performance:
  - <Any hard limits>

## 5) API / Interfaces
### Endpoints
- `POST /...`
  - Request: `{ ... }`
  - Response: `{ ... }`
  - Errors: `400`, `500`

## 6) Implementation Plan (Step-by-step)
### Step 1: <Title>
- Files:
  - `path/to/file`
- Changes:
  - <bullet list>
- Output:
  - <what should work after this step>

## 7) Verification Criteria (Must-pass)
### Manual test cases
- [ ] Scenario: <...>
  - Steps:
    1. ...
  - Expected:
    - ...

### Automated tests (if any)
- [ ] <test name> covers <behavior>

### Observability / logs
- [ ] Logs show <evidence> when <event> happens

## 8) Rollout Plan
- Release steps:
  1. ...
- Rollback plan:
  - ...

## 9) Risks & Edge Cases
- Risk: <...> → Mitigation: <...>

## 10) Open Questions
- [ ] <question>
