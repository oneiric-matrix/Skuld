# Issue Lifecycle & Project Board Management Rules

Every repository created from this template strictly enforces this issue lifecycle and GitHub Project integration.

---

## 1. Mandatory GitHub Project Association
* Every repository **MUST** have a dedicated GitHub Project board created and linked to it.
* The Project board must contain the following **Status** field columns (in order):
  1. `Triaging` *(Default for newly created issues)*
  2. `In Progress`
  3. `In Review`
  4. `Auto-Testing`
  5. `Manual Testing`
  6. `Done` *(Manual change only)*

---

## 2. Issue Ingestion Rules (Before Issue Creation)

When handling requests, agents and contributors must adhere to the issue type protocols:

### A. Title Naming Convention
* **MANDATORY PREFIX**: Every generated issue title **MUST begin with `[Gen]`**.
  * Examples: `[Gen][FEATURE]: Add user authentication`, `[Gen][BUG]: Fix null pointer on logout`, `[Gen][TASK]: Configure build workflow`.
  * This prefix allows the GitHub Project board to automatically filter and display these issues in a dedicated view grouped by status.

### B. New Requirements / Feature Requests
* **Iterative Clarification Required**: You MUST ask clarifying questions first, iteratively, until the requirement is 100% clear.
* **No Premature Issues**: Do NOT open an issue or write code until all ambiguities, edge cases, and user expectations are answered.
* **Final Log Content**: Once clarified, log the issue with:
  * Clarified requirement summary
  * Motivation & context
  * Detailed step-by-step implementation plan
  * Acceptance criteria checklist

### B. Bug Reports
* **RCA Before Logging**: Before logging the bug issue, investigate the Root Cause Analysis (RCA).
* **Final Log Content**: Log the issue containing:
  * Observed behavior & reproduction steps
  * Detailed Root Cause Analysis (why the defect occurred)
  * Concrete suggested fix / technical patch

### C. Tasks / Chores
* Log the issue directly with:
  * Clear task summary and objectives
  * Comprehensive checklist of deliverables and dependencies

---

## 3. Strict Status Progression Lifecycle

Issues progress through the project board following these exact transition triggers:

```
[Issue Created] ──> Triaging
                         │
                         ▼ (Changes started on dev/* branch)
                   In Progress
                         │
                         ▼ (Changes completed)
                    In Review
                         │
                         ▼ (Review approved)
                   Auto-Testing
                         │
                         ▼ (Automated test scripts pass)
                  Manual Testing
                         │
                         ▼ (User manual verification only)
                      Done
```

1. **`Triaging`**:
   * Initial state of every new issue upon creation.
2. **`In Progress`**:
   * Transition to `In Progress` immediately when active development / changes start on the `dev/*` branch.
3. **`In Review`**:
   * Transition to `In Review` as soon as the code changes are completed.
4. **`Auto-Testing`**:
   * Transition to `Auto-Testing` once review is completed. Automated suites and test scripts run here.
5. **`Manual Testing`**:
   * Transition to `Manual Testing` once all test scripts pass.
6. **`Done`**:
   * **STRICT HUMAN GATE**: Only the USER may manually change the status from `Manual Testing` to `Done`. Agents and automated workflows must NEVER mark an issue as `Done`.
