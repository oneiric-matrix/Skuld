# Contributing Guidelines

Thank you for contributing to this project! To maintain high code quality and smooth releases, all contributors and agents must follow these established standards.

---

## 1. Branching Strategy

We enforce a strict branch hierarchy:
```
dev/* ──(PR)──> unit ──(Manual)──> quality ──(Manual)──> integration ──(Manual)──> nightly ──(Manual)──> main
```

* **Branch off `unit`**: All new features, bugfixes, and tasks must branch as `dev/<task-name>` directly from `unit`.
* **Merge into `unit`**: `dev/*` branches can only PR and merge into `unit`.
* **Higher Promotion**: Merges to higher environments (`quality`, `integration`, `nightly`, `main`) require explicit user confirmation.
* See [Branching Guide](./docs/BRANCHING_GUIDE.md) for full details.

---

## 2. Issues & Planning

* All issue titles must begin with the `[Gen]` prefix (e.g. `[Gen][FEATURE]: Add user login`).
* **Requirements First**: Clarify requirements iteratively until 100% understood before opening issues or writing code.
* **Bug Reports**: Investigate and document Root Cause Analysis (RCA) and suggested fix.
* **Status Lifecycle**: Issues follow a 6-stage lifecycle (`Triaging` $\rightarrow$ `In Progress` $\rightarrow$ `In Review` $\rightarrow$ `Auto-Testing` $\rightarrow$ `Manual Testing` $\rightarrow$ `Done`).
* See [Issue Lifecycle](./docs/ISSUE_LIFECYCLE.md) for full details.

---

## 3. Unit Testing & 100% Coverage

* Every new or altered logic file must have matching unit tests.
* Tests must cover **both positive and negative cases** across 100% of the introduced code paths.
* PR checks will fail if tests are missing or broken.

---

## 4. Automatic Code Review Gate

Before merging into `unit`, the changes are reviewed across 6 pillars:
1. **Documentation** (thorough docs on all added functionality)
2. **Bug Search** (edge cases, unhandled nulls, race conditions)
3. **Security Analysis** (no secrets, injection checks, auth validation)
4. **Best Practices** (clean code, idiomatic typing, linting)
5. **Architecture** (modularity, separation of concerns)
6. **Performance** (algorithmic complexity, memory leaks, query efficiency)

Any review findings will be posted to the GitHub issue, resolved on the branch, and verified to preserve functionality.
