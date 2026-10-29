# Branching & Workflow Rules

You are working on a project that strictly follows the **Oneiric Git Branching Strategy**. You must adhere to these branch and PR rules at all times.

---

## 1. Branch Hierarchy

```
dev/* ──> unit ──> quality ──> integration ──> nightly ──> main
```

1. **`main`**: Production-ready releases.
2. **`nightly`**: Automated staging/nightly builds. Merges only into `main`.
3. **`integration`**: Cross-component integration testing. Merges only into `nightly`.
4. **`quality`**: QA/Testing verification. Merges only into `integration`.
5. **`unit`**: Working integration branch where individual changes land. Merges only into `quality`.
6. **`dev/*`**: Working feature, fix, or task branches. **Must be branched exclusively from `unit`**.

---

## 2. Strict Progression & Merge Rules

* **Day-to-day Development Flow**:
  * Any new change, feature, or bugfix must be developed on a branch starting with `dev/` created directly from `unit`.
  * Once changes, unit tests (100% coverage, positive + negative), and the 6-pillar code review are completed and approved, the `dev/*` branch is PR'd and merged into `unit`.
  * After merging into `unit`, the temporary `dev/*` branch can be deleted.

* **Higher Environment Promotion Gates (STRICTLY MANUAL)**:
  * **DO NOT automatically progress branches beyond `unit`**.
  * Merges from `unit` $\rightarrow$ `quality`, `quality` $\rightarrow$ `integration`, `integration` $\rightarrow$ `nightly`, and `nightly` $\rightarrow$ `main` require **explicit user instruction and confirmation**.
  * The agent must **NEVER** automatically cascade or promote changes beyond `unit` on its own.

* **Merge Target Restrictions**:
  * `dev/*` branches can **only** merge into `unit`. Merging `dev/*` into any other branch is forbidden.
  * `unit` can only merge into `quality`.
  * `quality` can only merge into `integration`.
  * `integration` can only merge into `nightly`.
  * `nightly` can only merge into `main`.

* **PR Creation Policy**:
  * For higher environments (`unit` and beyond), Pull Requests and merges should ONLY be created when specifically instructed by the user.

* **Branch Deletion**:
  * Only `dev/*` branches may ever be deleted after merge. Protected long-lived branches (`unit`, `quality`, `integration`, `nightly`, `main`) must **never** be deleted.
