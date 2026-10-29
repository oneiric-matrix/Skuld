# Automatic Code Review & Quality Gate Rules

Before any `dev/*` branch can be merged into `unit`, an automated and rigorous code review must be conducted. This rule outlines the required review dimensions, issue synchronization, and resolution protocol.

---

## 1. Mandatory 6-Pillar Code Review Checklist

Every review must systematically evaluate the code across these six pillars:

### 1. Documentation Review
* Verify that all newly added functions, classes, modules, and API endpoints are fully documented.
* Ensure docstrings/comments explain purpose, parameters, return values, exceptions, and side effects.
* Ensure relevant repository guides (`README.md`, architectural diagrams, `.env.example`) are updated if behavior changes.

### 2. Bug & Defect Search
* Perform deep static code inspection to uncover logic errors, off-by-one errors, uncaught promise rejections, race conditions, edge case failures, and unhandled null/undefined states.
* Check that boundary and negative conditions are properly managed.

### 3. Security Analysis
* **Vulnerability Scanning**: Identify potential injection vulnerabilities (SQL, NoSQL, OS Command, Code Injection), XSS, CSRF, and SSRF.
* **Secrets & Credentials**: Ensure no API keys, private tokens, passwords, or sensitive environment values are hardcoded.
* **Auth & Permissions**: Validate that authorization, role-based access, and token verification checks cannot be bypassed.
* **Input Sanitization**: Validate strict input schema parsing and parameter sanitization.

### 4. Best Practices & Code Standards
* Enforce DRY (Don't Repeat Yourself), KISS, and clean code principles.
* Verify proper idiomatic typing, error handling, structured logging, naming conventions, and linting standards.
* Confirm that unit tests exist for all logic, covering both positive and negative cases.

### 5. Architectural Alignment
* Verify that changes adhere to established design patterns (e.g. modularity, layer separation, separation of concerns).
* Check for tight coupling, circular dependencies, or inappropriate leaking of database models into API contracts.
* Ensure the solution fits cohesively within the broader application architecture.

### 6. Performance & Resource Review
* Detect algorithm inefficiencies (e.g. nested loops on unbounded collections, $O(n^2)$ complexity where $O(n)$ or $O(1)$ is achievable).
* Identify database anti-patterns (e.g. N+1 queries, missing indexing opportunities, unbounded queries without pagination).
* Check for memory leaks (unclosed sockets, hanging timers, unbounded cache growth) and excessive CPU/blocking operations.

---

## 2. Issue Tracking & Resolution Protocol

When review issues, questions, or improvements are identified:

1. **Document Findings in GitHub Issue**:
   * Post a structured comment directly on the related `[Gen]` issue titled:
     `### 🔍 Automated Code Review Findings`
   * Categorize findings under the 6 pillars with clear file paths, line references, severity (Critical, Warning, Suggestion), and actionable remedy.

2. **Remediation & Fix Implementation**:
   * Implement fixes on the active `dev/*` branch.
   * Verify that fixes resolve the flagged concern without introducing regressions or side effects.

3. **Functionality Preservation Validation**:
   * **Crucial Rule**: Validate that remediations do NOT negatively affect, alter, or break the intended functionality.
   * Run existing and newly added unit tests to confirm all positive and negative test cases still pass.

4. **Document Resolution**:
   * Post a follow-up comment on the GitHub issue:
     `### ✅ Review Comments Resolved`
   * Detail each resolved finding, the commit SHA of the fix, and verification that functionality and tests remain intact.

5. **Lifecycle Progression**:
   * Once all review comments are resolved and approved, update the GitHub Project status from `In Review` to `Auto-Testing`.
