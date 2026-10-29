# Pull Request Template

## Description
<!-- Provide a clear explanation of what changes this PR introduces. Reference the issue if applicable: e.g. Fixes #[Gen] Issue number -->

- **Related Issue**: #
- **Source Branch**: `dev/`
- **Target Branch**: `unit`

---

## 🧪 Unit Testing & Coverage Checklist
> **Rule**: Any logic must have unit tests covering the entire code path (both positive and negative cases). Merging into `unit` is only permitted when unit tests pass.

- [ ] **Positive Cases**: Valid inputs, expected flows, state mutations, and success conditions tested.
- [ ] **Negative Cases**: Error handling, edge cases, invalid/null inputs, boundary conditions, and exceptions tested.
- [ ] **Full Path Coverage**: Entire logic introduced or changed is exercised by unit tests.
- [ ] **Local Verification**: All unit tests pass locally before opening/updating this PR.

---

## 🔍 Automated Code Review Gate (6 Pillars)
> **Rule**: Before merging into `unit`, the PR must be evaluated against all 6 review pillars. Any issues must be logged in the related issue, fixed, and verified without breaking functionality.

- [ ] **1. Documentation**: All added functionality, parameters, and public interfaces are documented.
- [ ] **2. Bug Search**: Static analysis completed; no unhandled edge cases, race conditions, or null pointers found.
- [ ] **3. Security Analysis**: No injection risks, hardcoded secrets, auth bypasses, or unsafe deserialization.
- [ ] **4. Best Practices**: Adheres to language standards, naming conventions, DRY, and linting rules.
- [ ] **5. Architecture Validation**: Follows separation of concerns, modular boundaries, and clean layer abstractions.
- [ ] **6. Performance Review**: No algorithmic bottlenecks, memory leaks, or N+1 query patterns.

---

## 💬 Issue Feedback & Resolution Checklist
- [ ] Review comments posted to related `[Gen]` issue (if issues were flagged).
- [ ] Review items resolved and resolution summary posted to issue.
- [ ] Verified that resolutions preserve original functionality without regressions.

---

## 📋 Progression Checklist
- [ ] Target branch is verified to be `unit`.
- [ ] Automated tests pass in CI (`Unit Tests & Coverage`).
- [ ] Issue status updated to `In Review` or `Auto-Testing`.
