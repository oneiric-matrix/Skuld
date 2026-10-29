# New Repository & Project Setup Checklist

Whenever a new repository is initialized from this template, follow this checklist to ensure all branching, issue lifecycle, and status boards are operational.

---

## 1. Create the GitHub Project (Board)

Every repository must have a dedicated GitHub Project board configured with the strict lifecycle statuses.

### Option A: Automated Script
Run the built-in setup script from your workspace:
```bash
node scripts/setup-project.js --owner <org-or-username> --title "<Project Name>"
```
*(Requires a GitHub Personal Access Token with the **`project`** scope: `read:project`, `write:project`, or organization project admin).*

### Option B: Manual UI Setup (GitHub Free Tier)
1. In GitHub, go to your Organization/User profile $\rightarrow$ **Projects** $\rightarrow$ **New project** $\rightarrow$ select **Board**.
2. Name the project after the repository (e.g. `oneiric-template Project`).
3. Click on the **Status** column header $\rightarrow$ **Edit field**.
4. Set the status options in this exact order:
   1. ⚪ **`Triaging`** (Default for new items)
   2. 🔵 **`In Progress`**
   3. 🟣 **`In Review`**
   4. 🟡 **`Auto-Testing`**
   5. 🟠 **`Manual Testing`**
   6. 🟢 **`Done`** (Human/Manual only)
5. Delete any default columns that don't match (e.g. "Todo").
6. Create a new **Board View**:
   - Layout: **Board** (columns group by **Status**)
   - Name: **`[Gen] Issues`**
   - Filter input box: **`[Gen]`** (filters the board to only display generated issues)
7. Link the Project to your repository: Project Settings $\rightarrow$ **Linked repositories** $\rightarrow$ select your repo.

---

## 2. Initialize Permanent Branches

Initialize the promotion ladder branches in git:

```bash
git checkout -b main
git push origin main

git checkout -b nightly
git push origin nightly

git checkout -b integration
git push origin integration

git checkout -b quality
git push origin quality

git checkout -b unit
git push origin unit
```

Set the default branch to `unit` or `main` depending on your preference.

---

## 3. Configure Branch Rules / Protection

Go to repository **Settings** $\rightarrow$ **Branches** (or **Rulesets**):
1. Add rules for `main`, `nightly`, `integration`, `quality`, and `unit`.
2. Check:
   - **Require a pull request before merging**.
   - **Require status checks to pass before merging**:
     - `Validate Source and Target Branches` (from branch-gatekeeper workflow).
     - `Unit Tests & Coverage` (from unit-tests workflow, required on `unit`).
   - **Do not allow deletions** (protecting all branches except temporary `dev/*` branches).
   - **Restrict direct pushes** (enforces PR-only flow).
