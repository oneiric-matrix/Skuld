# Branch Protection & Setup Guide (GitHub Free Tier)

Because GitHub Free public and private repositories have different branch protection features (classic branch protection rules vs fine-grained rulesets):

---

## 1. Branch Strategy Overview

```
dev/* ──(PR)──> unit ──(PR)──> quality ──(PR)──> integration ──(PR)──> nightly ──(PR)──> main
```

| Branch | Allowed Source | Description | Promotion Automation | Allowed to Delete? |
| :--- | :--- | :--- | :--- | :--- |
| `dev/*` | `unit` | Feature/task working branches | Automated to `unit` on task complete | **Yes** (after merge) |
| `unit` | `dev/*` | Aggregates feature unit development | **Manual user confirmation only** | **NO** |
| `quality` | `unit` | QA / Testing staging | **Manual user confirmation only** | **NO** |
| `integration` | `quality` | Cross-system integration staging | **Manual user confirmation only** | **NO** |
| `nightly` | `integration` | Pre-production staging & nightly tests | **Manual user confirmation only** | **NO** |
| `main` | `nightly` | Production-ready stable release | **Manual user confirmation only** | **NO** |

---

## 2. Daily Development vs. Release Promotion

### Daily Development (`dev/*` $\rightarrow$ `unit`)
* Developers & AI agents work on `dev/<task>` branched from `unit`.
* Once changes, full unit test coverage (positive/negative), and code reviews pass, `dev/*` is merged into `unit`.
* The `dev/*` branch is deleted.

### Higher Branch Progression (`unit` $\rightarrow$ `quality` $\rightarrow$ `integration` $\rightarrow$ `nightly` $\rightarrow$ `main`)
* **Strict Human Confirmation**: Promotion through higher branches is **never automated**.
* Each stage requires manual verification and explicit user confirmation before opening and merging the next PR.

---

## 2. Automated Gatekeeper

We included a GitHub Actions workflow: [`.github/workflows/branch-gatekeeper.yml`](file:///d:/GHTemplate/.github/workflows/branch-gatekeeper.yml).

Every Pull Request automatically runs this check. If someone opens a PR from an invalid source (e.g., trying to merge `dev/*` directly to `main` or `integration` directly to `main`), the workflow fails and blocks the PR.

---

## 3. GitHub Repository Settings (Free Tier Setup)

To protect the branches against accidental deletion or direct pushes:

1. Navigate to: **Settings > Branches** (or **Settings > Rulesets**).
2. For each permanent branch (`main`, `nightly`, `integration`, `quality`, `unit`):
   * Add a rule matching the branch name (or a pattern like `main`, `nightly`, `integration`, `quality`, `unit`).
   * **Require a pull request before merging**.
   * **Require status checks to pass before merging**:
     * Add `Validate Source and Target Branches` (from the gatekeeper workflow).
   * **Do not allow deletions**: Ensures only `dev/*` branches can ever be deleted.
   * **Restrict direct pushes** / **Lock branch**: Prevents force pushes and bypassing PRs.
