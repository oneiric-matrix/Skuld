<div align="center">

# 🌟 Project Name

<p align="center">
  <strong>A concise, compelling one-line elevator pitch of what this project does.</strong>
</p>

[![Branch Progression](https://img.shields.io/badge/git-dev%20%E2%86%92%20unit%20%E2%86%92%20main-blueviolet?style=for-the-badge&logo=git)](./docs/BRANCHING_GUIDE.md)
[![Status Board](https://img.shields.io/badge/project-6--stage%20lifecycle-blue?style=for-the-badge&logo=github)](./docs/ISSUE_LIFECYCLE.md)
[![Unit Tests](https://img.shields.io/badge/tests-100%25%20logic%20coverage-brightgreen?style=for-the-badge&logo=checkmarx)](./docs/NEW_REPO_SETUP.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

</div>

> [!NOTE]
> **Template Explanation**: This README serves as the standardized blueprint for projects created from the **Oneiric Template**. Replace placeholder brackets `{{ ... }}` with your actual project specifics while preserving the clean structure and design badges.

---

## 💡 The Idea

### Overview
> *Explain the core motivation, target audience, and business or architectural problem this project solves in 1–2 paragraphs.*

**Example:**
Modern cloud orchestration systems struggle with configuration drift and latency. **Project Name** introduces a deterministic, state-driven workflow engine that synchronizes distributed microservice configurations in real time with sub-millisecond propagation latency.

### Key Highlights & Features
* ⚡ **High-Throughput Processing**: Handles up to 100k events/sec with linear scale-out capability.
* 🛡️ **Fault Tolerance & Resilience**: Built-in automatic circuit breaking and self-healing worker pools.
* 🧩 **Modular Plugin Architecture**: Easily extendable with custom adapters and external connectors.
* 🔍 **Real-Time Observability**: Native OpenTelemetry instrumentation with distributed tracing.

---

## 🛠️ Tech Stack & Architecture

> *List the languages, runtimes, primary frameworks, databases, and tooling used across the system.*

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime / Language** | TypeScript / Node.js | `^20.x` | Core backend runtime and type safety |
| **Framework** | Fastify | `^4.x` | Low-overhead HTTP API server |
| **Data Store** | PostgreSQL | `^16.0` | Primary transactional relational database |
| **Cache / Queue** | Redis | `^7.2` | Ephemeral caching and pub/sub message broker |
| **Testing** | Vitest / Jest | `^2.x` | High-performance unit and integration testing |
| **CI/CD** | GitHub Actions | `v4` | Automated linting, test suites, and branching gates |

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Client / UI   │ ────> │ Fastify Backend │ ────> │ PostgreSQL DB   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Redis Cache   │
                          └─────────────────┘
```

---

## 🏗️ Build & Engineering Rules

This repository strictly enforces the **Oneiric Engineering Standards**:

### 1. Strict Branch Hierarchy
```
dev/* ──(Automated PR)──> unit ──(Manual)──> quality ──(Manual)──> integration ──(Manual)──> nightly ──(Manual)──> main
```
* **Daily Development (`dev/*` $\rightarrow$ `unit`)**: Any change, bugfix, or feature branches as `dev/<task>` directly from `unit`. Upon passing unit tests and the 6-pillar code review, it merges into `unit` and the `dev/*` branch is deleted.
* **Higher Environment Promotion (Manual Only)**: Merges from `unit` $\rightarrow$ `quality` $\rightarrow$ `integration` $\rightarrow$ `nightly` $\rightarrow$ `main` are **never automated**. They strictly require user confirmation before promotion.
* **Branch Deletion**: Only temporary `dev/*` branches are deleted after merge. Long-lived branches are protected.
* 📖 *Full details*: [`docs/BRANCHING_GUIDE.md`](./docs/BRANCHING_GUIDE.md)

### 2. Issue Lifecycle & Board Management
* **Prefix Convention**: Every issue title begins with `[Gen]` (e.g. `[Gen][FEATURE]: Add user login`).
* **Requirements First**: New features must be iteratively clarified with questions until 100% clear before issue logging.
* **Bugs & RCA**: Bugs must be investigated with Root Cause Analysis (RCA) and suggested fix documented in the ticket.
* **6-Stage Status Lifecycle**:
  ```
  Triaging ──> In Progress ──> In Review ──> Auto-Testing ──> Manual Testing ──> Done
  ```
  *(Note: Transition to **Done** is strictly manual by the user).*
* 📖 *Full details*: [`docs/ISSUE_LIFECYCLE.md`](./docs/ISSUE_LIFECYCLE.md)

### 3. Unit Test Coverage Standard
* **100% Logic Path Coverage**: Every logic file must have matching unit tests covering all conditional branches and fallbacks.
* **Positive & Negative Scenarios**: Both valid execution paths and error boundaries/exceptions must be tested.
* **PR Gate**: Merging into `unit` is blocked unless all unit tests pass in CI.

### 4. Automated 6-Pillar Code Review
Before any `dev/*` branch merges into `unit`, an automatic review checks:
1. **Documentation**: Thorough docs for all added functionality.
2. **Bug Search**: In-depth defect and edge case detection.
3. **Security Analysis**: Injection, auth bypass, and secret vulnerability scanning.
4. **Best Practices**: Clean code, idiomatic typing, and standards compliance.
5. **Architecture**: Clean modular boundaries and structural alignment.
6. **Performance**: Algorithmic complexity, memory profiling, and query efficiency.

> **Issue Feedback Loop**: Any flagged concerns are documented directly on the GitHub issue, resolved on the branch, confirmed that fixes do not compromise functionality, and resolutions logged before advancing to `Auto-Testing`.

---

## 🚀 How to Use & Get Started

### Prerequisites
* [Node.js](https://nodejs.org/) (`>= 20.x`)
* [Git](https://git-scm.com/)
* [Docker](https://www.docker.com/) *(optional, for local database/cache dependencies)*

### 1. Installation
Clone the repository and install project dependencies:

```bash
git clone https://github.com/oneiric-matrix/oneiric-template.git
cd oneiric-template
npm install
```

### 2. Environment Configuration
Copy the template environment file and adjust your local parameters:

```bash
cp .env.example .env
```

```ini
# .env sample configuration
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/app_db
REDIS_URL=redis://localhost:6379
```

### 3. Running Locally
Start the development server with live reload:

```bash
npm run dev
```

### 4. Running Tests
Run the comprehensive unit test suite:

```bash
# Run unit tests
npm test

# Run tests with coverage report
npm test -- --coverage
```

### 5. Production Build
Compile and bundle the application for production:

```bash
npm run build
npm start
```

---

## 👥 Contributing & Community

Contributions are governed by our issue templates and branch promotion pipeline:
1. Review [`docs/ISSUE_LIFECYCLE.md`](./docs/ISSUE_LIFECYCLE.md) for how requirements and bugs are ingested.
2. Ensure all changes are branched from `unit` as `dev/*`.
3. Verify all unit tests pass locally before requesting a PR.

---

<div align="center">
  <sub>Built with ❤️ by the <strong>Oneiric Matrix</strong> team. Powered by Antigravity.</sub>
</div>
