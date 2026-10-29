# Issue & Project Board Lifecycle Guide

This guide details how every repository using this template tracks work across GitHub Issues and GitHub Projects.

---

## 1. GitHub Project Setup

Every repository repository requires an associated **GitHub Project (v2)** with a `Status` single-select field containing these exact options:

| # | Status Column | Description | Changed By |
|---|---|---|---|
| 1 | **Triaging** | Newly logged issues awaiting review or work | Automated (Default) |
| 2 | **In Progress** | Active coding/work started on a `dev/*` branch | Agent / Contributor |
| 3 | **In Review** | Changes implemented; undergoing review | Agent / Contributor |
| 4 | **Auto-Testing** | Review passed; automated CI & test scripts executing | Agent / CI Workflow |
| 5 | **Manual Testing** | Test scripts green; waiting for user signoff | Agent / CI Workflow |
| 6 | **Done** | Complete and verified | **User Only (Manual)** |

> [!IMPORTANT]
> The **Done** column is strictly manual. Agents and automated scripts must never advance an issue from `Manual Testing` to `Done`.

### 3. Automated Code Review Protocol (In Review Phase)
Before any `dev/*` branch merges into `unit`:
1. **6 Pillars Evaluated**:
   - 📝 **1. Documentation**: Verify new functions, classes, and configurations are thoroughly documented.
   - 🐛 **2. Bug Search**: Static analysis for logic defects, edge cases, and unhandled nulls.
   - 🔒 **3. Security Analysis**: Audit for vulnerabilities (injections, hardcoded secrets, auth flaws).
   - 📐 **4. Best Practices**: Enforce clean code, typing, and standard conventions.
   - 🏛️ **5. Architecture Validation**: Modularity, separation of concerns, and design cohesion.
   - ⚡ **6. Performance Review**: Algorithmic complexity, memory leaks, and query bottlenecks.
2. **Issue Feedback Loop**:
   - If issues are flagged, post a detailed comment on the related `[Gen]` issue (`### 🔍 Automated Code Review Findings`).
   - Resolve all comments on the `dev/*` branch.
   - **Crucial**: Verify that review resolutions do NOT alter or break existing functionality.
   - Post confirmation on the issue (`### ✅ Review Comments Resolved`).
   - Move issue from `In Review` to `Auto-Testing`.

---

## 3. GitHub Actions CI Enforcement

### 💡 New Requirements (Features)
1. **Iterative Questioning**: Before logging an issue, contributors / AI agents must ask clarifying questions iteratively until the requirement is 100% understood.
2. **Issue Filing**: After complete clarification, create the issue using [`.github/ISSUE_TEMPLATE/01_feature_request.yml`](file:///d:/GHTemplate/.github/ISSUE_TEMPLATE/01_feature_request.yml) with:
   - Clarified Requirement Summary
   - Motivation & Context
   - Concrete Step-by-Step Implementation Plan
   - Acceptance Criteria

### 🐛 Bug Reports
1. **Root Cause Analysis (RCA)**: Perform deep investigation into the root cause before opening the ticket.
2. **Issue Filing**: Create the issue using [`.github/ISSUE_TEMPLATE/02_bug_report.yml`](file:///d:/GHTemplate/.github/ISSUE_TEMPLATE/02_bug_report.yml) with:
   - Reproduction Steps
   - Detailed RCA
   - Proposed Fix / Solution

### ⚙️ Tasks
1. Log technical chores, refactors, and infrastructure updates using [`.github/ISSUE_TEMPLATE/03_task.yml`](file:///d:/GHTemplate/.github/ISSUE_TEMPLATE/03_task.yml) with:
   - Task summary
   - Scope and deliverables checklist
   - Dependencies and constraints
