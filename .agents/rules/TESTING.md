# Unit Testing & Coverage Rules

You are working on a project that strictly requires comprehensive unit testing for all business and application logic.

---

## 1. Mandatory Unit Test Requirement
* **Every Logic File Must Have Tests**: Any new or modified module, function, class, or service containing business logic must be accompanied by corresponding unit tests.
* **100% Logic Path Coverage**:
  * Unit tests must cover the entire code paths of the logic being introduced or altered.
  * Every conditional branch, edge case, and fallback path must be exercised.
* **Positive and Negative Cases**:
  * **Positive Cases**: Valid inputs, expected executions, correct state transitions, and expected return values.
  * **Negative Cases**: Invalid inputs, null/undefined/empty boundaries, thrown exceptions, error responses, and rejected promises.
* **No Logic Without Tests**: Never mark changes completed or request review for code that lacks unit tests.

---

## 2. Dev Branch Merge Gate
* Merging any `dev/*` branch into `unit` is **strictly blocked** unless all unit test suites pass completely without failure.
* Unit test runs must be automated in CI via the Pull Request check (`Unit Tests & Coverage`).
* If a test fails in CI or locally, the issue remains in `In Progress` until the defect or test is fixed.
