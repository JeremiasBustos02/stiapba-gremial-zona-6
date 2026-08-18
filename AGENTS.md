# AGENTS.md

## 1. Purpose

This file defines the rules that AI coding agents must follow when working in this repository.

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists inside a subdirectory.

The project is a production-oriented MVP.

The priority is:

```text
Correctness
→ Simplicity
→ Maintainability
→ Security
→ User Experience
→ Performance
```

Do not optimize prematurely.

---

# 2. Project Context

This repository contains a web-based document management system.

The MVP allows authenticated users to generate PDF documents from predefined templates.

The first supported document is:

```text
Permiso Gremial
```

The application is primarily used from mobile devices.

There are two roles:

```text
ADMIN
DELEGADO
```

The system is designed to evolve in the future, but only the current MVP scope must be implemented.

---

# 3. Source of Truth

Before making architectural or functional decisions, read the relevant documentation.

Documentation:

```text
docs/
├── 01_CONTEXT.md
├── 02_REQUIREMENTS.md
├── 03_USER_FLOWS.md
├── 04_DOMAIN_MODEL.md
├── 05_API.md
├── 06_ARCHITECTURE.md
├── 07_UI_UX.md
└── 08_ROADMAP.md
```

Execution plan:

```text
PLAN.md
```

Visual references:

```text
docs/wireframes/
```

PDF templates:

```text
docs/pdf-templates/
```

Do not invent requirements when documentation already defines the expected behavior.

---

# 4. Documentation Priority

If documentation appears contradictory, use this priority:

```text
01_CONTEXT.md
        ↓
02_REQUIREMENTS.md
        ↓
03_USER_FLOWS.md
        ↓
04_DOMAIN_MODEL.md
        ↓
05_API.md
        ↓
06_ARCHITECTURE.md
        ↓
07_UI_UX.md
        ↓
08_ROADMAP.md
        ↓
PLAN.md
```

However, do not silently resolve meaningful contradictions.

Wireframes are visual references only. If a wireframe represents functionality outside the MVP, `01_CONTEXT.md` and `02_REQUIREMENTS.md` prevail.

If two documents define incompatible behavior:

1. Identify the contradiction.
2. Explain the impact.
3. Stop the affected implementation.
4. Ask the developer which behavior should be authoritative.

Do not guess.

---

# 5. MVP Scope

The MVP includes:

## Authentication

* Login with DNI and password.
* ADMIN and DELEGADO roles.
* Mandatory password change on first login.
* Logout.
* Active/inactive users.

## Administration

* Users.
* Companies.
* Agreements.

## Documents

* ADMIN management of templates and template variants.
* DELEGADO read-only access to active templates and variants.
* Permiso Gremial.
* PDF generation.
* PDF preview.
* PDF download.
* Printing.

## UI

* Mobile First.
* Responsive desktop support.
* Role-aware navigation.
* UI based on approved wireframes.

---

# 6. Explicitly Out of Scope

Do NOT implement unless explicitly requested:

```text
SMTP
Email sending
Google Drive
Cloud document storage
Document history
Persistent drafts
Persistent Document entity
Official document numbering
WhatsApp integration
Digital signatures
Notifications
Analytics
Native mobile applications
Public registration
Email password recovery
Dynamic form builder
```

Do not create infrastructure for these features "just in case".

---

# 7. No Scope Creep

Do not implement functionality merely because it could be useful.

Do not use reasoning such as:

```text
This may be useful later.
This would make the system more scalable.
This is common in production applications.
```

Future extensibility is desirable only when it does not significantly increase current complexity.

If an improvement is outside scope:

1. Mention it.
2. Explain its potential value briefly.
3. Do not implement it.

---

# 8. Architecture

The MVP architecture is:

```text
React + TypeScript + Vite
           │
           │ REST
           ▼
Java 21 + Spring Boot
           │
           ├── PostgreSQL
           │
           └── PDFBox
```

The backend is a modular monolith.

Do not introduce:

* Microservices.
* Kafka.
* RabbitMQ.
* CQRS.
* Event sourcing.
* Kubernetes.
* GraphQL.
* Redis.
* Distributed caching.

unless explicitly approved.

---

# 9. Frontend Stack

Use:

```text
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
React Router
TanStack Query
React Hook Form
Zod
```

Do not introduce another UI framework.

Do not add another state management library unless a concrete requirement justifies it.

In particular, do not add Redux by default.

---

# 10. Backend Stack

Use:

```text
Java 21
Spring Boot
Spring Web
Spring Security
Spring Data JPA
Hibernate
Bean Validation
Flyway
Apache PDFBox
PostgreSQL
```

Do not add libraries merely to avoid writing a small amount of straightforward code.

---

# 11. Dependency Policy

Before adding a dependency:

1. Check whether the current stack already solves the problem.
2. Prefer platform/framework capabilities.
3. Consider maintenance and security impact.
4. Add the dependency only if it provides clear value.

Do not add dependencies for trivial utilities.

If a significant new dependency is necessary, explain why before adding it.

---

# 12. Implementation Philosophy

Prefer:

```text
Simple
Explicit
Typed
Testable
Readable
```

over:

```text
Abstract
Generic
Clever
Prematurely extensible
```

Avoid speculative abstractions.

Three similar lines of understandable code can be better than a premature generic framework.

---

# 13. Do Not Overengineer

Do not create:

* unnecessary interfaces;
* unnecessary factories;
* unnecessary base classes;
* generic repositories;
* generic CRUD frameworks;
* internal event buses;
* custom dependency injection;
* complex mapping layers;

unless they solve an actual current problem.

Abstractions should emerge from real duplication or a clear architectural boundary.

---

# 14. Domain Model

Persistent entities for the MVP are limited to:

```text
User
Company
Agreement
Template
TemplateVariant
```

Do not create:

```text
Document
History
Draft
Recipient
EmailLog
StorageFile
Signature
TemplateField
```

unless the scope is explicitly changed.

---

# 15. Naming

Technical code should use English naming.

Examples:

```text
User
Company
Agreement
Template
TemplateVariant
DocumentGenerationService
PermisoGremialGenerator
```

User-facing text should remain in Spanish.

Do not mix Spanish and English arbitrarily in code identifiers.

---

# 16. Backend Organization

Prefer feature/domain-oriented organization.

Example:

```text
backend/src/main/java/.../
├── auth/
├── user/
├── company/
├── agreement/
├── template/
├── document/
├── security/
├── common/
└── config/
```

Within a feature, use only the layers that are actually necessary.

Example:

```text
user/
├── controller/
├── service/
├── repository/
├── dto/
└── entity/
```

Do not create empty architectural layers.

---

# 17. Controllers

Controllers should:

* Parse HTTP requests.
* Validate request structure.
* Call application/service logic.
* Return appropriate responses.

Controllers should not contain substantial business logic.

Do not access repositories directly from controllers unless there is an unusually simple and justified case.

---

# 18. Services

Services should contain application and business logic.

Avoid giant services.

Prefer cohesive services with clear responsibilities.

Do not split services into many tiny classes without a meaningful reason.

---

# 19. Repositories

Repositories are responsible for persistence access.

Do not expose persistence concerns to frontend contracts.

Do not implement generic repository abstractions over Spring Data JPA.

---

# 20. DTO Policy

Never expose JPA entities directly through REST controllers.

Use explicit request and response DTOs.

Example:

```text
User
 ↓
UserResponse
```

Do not return:

```text
passwordHash
```

or internal persistence fields.

---

# 21. Mapping

Prefer manual mapping while mappings remain simple.

Do not introduce MapStruct automatically.

If mapping becomes repetitive enough to justify MapStruct, propose it before introducing it.

---

# 22. Database

Use PostgreSQL.

All schema changes must use Flyway.

Do not rely on Hibernate automatic schema creation in production.

Production should not use:

```text
ddl-auto=create
ddl-auto=update
```

Flyway is the source of truth for schema evolution.

---

# 23. Flyway

Migration files must be immutable after they have been applied/shared.

If the schema needs to change, create a new migration.

Use descriptive migration names.

Example:

```text
V1__create_users.sql
V2__create_companies.sql
```

Do not silently edit old migrations to make tests pass once those migrations are established.

---

# 24. Secrets

Never hardcode:

* Passwords.
* JWT secrets.
* Database credentials.
* API keys.
* Production URLs containing credentials.

Use environment variables.

Maintain safe examples in:

```text
.env.example
```

Never place real secrets in `.env.example`.

---

# 25. Authentication

Authentication uses:

```text
DNI + password
```

Passwords must be hashed using BCrypt or the approved Spring Security password encoder.

Never store plaintext passwords.

Never log passwords.

---

# 26. JWT

The preferred strategy is:

```text
JWT
+
HttpOnly cookie
```

In production the cookie should use appropriate:

```text
HttpOnly
Secure
SameSite
```

settings.

Do not store JWT in `localStorage` without explicit approval.

---

# 27. Authorization

Backend authorization is mandatory.

Frontend role checks exist only for UX.

Never assume that hiding an ADMIN button protects an endpoint.

ADMIN endpoints must be protected by Spring Security.

---

# 28. First Login

New/reset users have:

```text
firstLogin = true
```

They may authenticate but must change their password before normal application use.

Do not allow the frontend alone to enforce this rule.

Backend behavior must also prevent bypass when appropriate.

---

# 29. Temporary Passwords

When creating or resetting a user:

1. Generate a temporary password securely.
2. Hash it immediately.
3. Persist only the hash.
4. Return plaintext only in the creation/reset response.
5. Never allow the temporary plaintext password to be queried later.
6. Set `firstLogin = true`.

---

# 30. PDF Templates

The MVP uses predefined PDF files.

The files represent variants of a Template.

Example:

```text
Permiso Gremial
├── Firma A
├── Firma B
└── Firma C
```

Do not create a `Signature` entity.

The signature is already part of the PDF file.

---

# 31. PDF Storage

For the MVP, template files use configured local storage.

ADMIN may upload and replace variant PDFs through the application. PostgreSQL stores only a safe `fileKey`; PDF bytes remain in `TemplateFileStorage`. The local implementation must use persistent storage in production.

Use the abstraction:

```text
TemplateFileStorage
```

with:

```text
LocalTemplateFileStorage
```

Do not implement:

```text
GoogleDriveTemplateFileStorage
S3TemplateFileStorage
```

yet.

---

# 32. PDF Generation

Use Apache PDFBox.

Prefer AcroForm fields when the provided PDF supports them.

Do not use hardcoded drawing coordinates if appropriate AcroForm fields already exist.

Before implementing a generator:

1. Inspect the real PDF.
2. Identify the exact fields.
3. Document them.
4. Implement against the verified template.

Do not guess field names.

---

# 33. PDF Template Integrity

Never modify the source template file.

Each generation request must operate on a copy/in-memory representation.

The source PDF must remain unchanged.

---

# 34. Generated PDFs

The MVP does not persist generated PDFs.

Flow:

```text
Request
   ↓
Generate in memory
   ↓
HTTP response
   ↓
Frontend Blob
```

Do not:

* save generated PDFs to PostgreSQL;
* create document history;
* upload them to cloud storage;
* create a persistent Document entity.

---

# 35. Frontend PDF Handling

The frontend should reuse the generated Blob for:

* Preview.
* Download.
* Print.

Do not request another generation merely to download the same PDF.

---

# 36. Frontend Architecture

Prefer feature-oriented organization.

Example:

```text
src/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── users/
│   ├── companies/
│   ├── agreements/
│   ├── templates/
│   └── documents/
├── hooks/
├── lib/
├── services/
└── types/
```

Do not place the entire application in generic `components/` and `utils/` folders.

---

# 37. Server State

Use TanStack Query for server state.

Examples:

* users;
* companies;
* agreements;
* templates;
* variants.

Do not duplicate TanStack Query data unnecessarily into global state.

---

# 38. Forms

Use:

```text
React Hook Form
+
Zod
```

for user-facing forms where appropriate.

Frontend validation improves UX.

Backend validation remains authoritative.

---

# 39. UI Components

Prefer shadcn/ui components when appropriate.

Do not recreate existing primitives unnecessarily.

At the same time, do not force every UI element into a shadcn component when semantic HTML is simpler.

---

# 40. Mobile First

The primary target is approximately:

```text
390px
```

Every user-facing feature must be checked on mobile.

Also verify:

```text
768px
1440px
```

Do not build desktop first and attempt to shrink it afterward.

---

# 41. Wireframes

Wireframes are the primary visual reference.

Do not redesign screens without explicit approval.

Small implementation adjustments are acceptable when required for:

* accessibility;
* responsive behavior;
* technical feasibility.

If a significant visual change is needed, explain it before implementing it.

---

# 42. Navigation

Do not invent new navigation structures when the wireframes already define one.

Mobile and desktop navigation may differ visually while preserving the same information architecture.

---

# 43. UX States

Any UI consuming remote data must consider, where relevant:

```text
loading
success
empty
error
```

Do not implement only the happy path.

---

# 44. User-Facing Errors

Never display raw backend exceptions.

Avoid messages such as:

```text
NullPointerException
HTTP 500
SQL error
JWTException
```

Use understandable Spanish messages.

Technical details belong in controlled logs.

---

# 45. Accessibility

Maintain:

* semantic HTML;
* visible labels;
* keyboard navigation;
* visible focus;
* sufficient contrast;
* accessible dialogs;
* meaningful button text.

Do not sacrifice accessibility to exactly reproduce a visual mockup.

---

# 46. Testing Philosophy

Tests should protect important behavior.

Prioritize:

* Authentication.
* Authorization.
* Business rules.
* PDF generation.
* Critical user flows.

Do not write meaningless tests only to increase coverage percentage.

---

# 47. Backend Tests

At minimum, important flows should cover:

```text
login
inactive users
first login
roles
duplicate DNI
company/agreement state
PDF generation
invalid variant
missing template file
```

Use unit or integration tests depending on what provides the most confidence.

---

# 48. Frontend Tests

Prioritize:

* Form validation.
* Protected navigation.
* Role-specific behavior.
* First-login flow.
* Critical document-generation interactions.

Avoid snapshot-heavy testing without meaningful behavioral assertions.

---

# 49. Build Verification

After modifying backend code, run the appropriate backend tests/build.

After modifying frontend code, run the appropriate:

* type checking;
* linting;
* tests;
* build;

according to the configured project scripts.

Do not claim a change works if verification was not executed.

If verification cannot be executed, state why.

---

# 50. Fixing Errors

When a test/build fails:

1. Read the complete relevant error.
2. Identify the root cause.
3. Fix the root cause.
4. Re-run the relevant verification.

Do not blindly change configuration until the error disappears.

Do not disable tests to obtain a green build.

---

# 51. Linting and Type Safety

Do not suppress errors unnecessarily.

Avoid:

```text
any
// @ts-ignore
@SuppressWarnings
```

unless there is a specific justified reason.

Prefer solving the actual typing or design problem.

---

# 52. Error Handling

Do not catch exceptions merely to ignore them.

Avoid empty catch blocks.

Errors should either:

* be handled;
* be transformed appropriately;
* or propagate to the correct centralized handler.

---

# 53. Logging

Logs should help diagnose operational problems.

Do not log:

* passwords;
* JWTs;
* secrets;
* unnecessary personal data.

Do not leave verbose debug logging enabled by default in production.

---

# 54. Comments

Comments should explain:

```text
WHY
```

not restate:

```text
WHAT
```

Prefer readable code over excessive comments.

Do not add comments to obvious lines.

---

# 55. Dead Code

Do not leave:

* unused imports;
* commented-out implementations;
* obsolete components;
* unused experimental code.

If an implementation is replaced, remove the old implementation unless it is intentionally retained for a documented reason.

---

# 56. Refactoring

Refactor when necessary to complete the current task safely.

Do not perform broad unrelated refactors while implementing a feature.

If significant technical debt is discovered:

1. Mention it.
2. Explain its impact.
3. Do not automatically rewrite unrelated modules.

---

# 57. File Changes

Keep diffs focused.

Do not reformat unrelated files.

Do not rename unrelated code.

Do not change line endings across the repository.

Avoid touching files that are unrelated to the requested task.

---

# 58. Git

The developer controls repository history.

The agent must NOT execute without explicit developer instruction:

```text
git commit
git push
git merge
git rebase
git tag
git reset --hard
git clean
```

The agent may use read-only Git commands when useful:

```text
git status
git diff
git log
git show
```

Do not modify Git history.

Do not automatically change branches.

---

# 59. Commits

The developer performs commits manually.

After completing a task, the agent may suggest a Conventional Commit message if useful.

Example:

```text
feat: implement authentication flow
```

Do not execute the commit.

---

# 60. Destructive Commands

Do not execute destructive commands without explicit approval.

Examples:

```text
rm -rf
DROP DATABASE
DROP TABLE
git reset --hard
git clean -fd
docker volume rm
```

Prefer reversible operations.

---

# 61. Database Safety

Do not delete production or potentially valuable data.

During development, destructive database resets should only occur when clearly operating against disposable local/test environments.

If environment identity is uncertain, stop.

---

# 62. Developer-Owned Files

Do not overwrite documentation, wireframes, PDF templates, environment files, or developer-created configuration unless required by the current task.

If a file appears manually maintained and a change is not obviously required, preserve it.

---

# 63. Working With Existing Code

Before changing code:

1. Inspect the relevant files.
2. Understand existing conventions.
3. Search for related implementations.
4. Reuse existing patterns when reasonable.

Do not assume the repository follows a pattern without checking it.

---

# 64. Do Not Rewrite Working Code Without Reason

If existing code:

* satisfies requirements;
* is understandable;
* is tested;
* does not create a concrete problem;

do not rewrite it merely because another style is preferred.

---

# 65. Task Execution

For each requested task:

## Before coding

* Read relevant docs.
* Inspect relevant code.
* Identify dependencies.
* Identify ambiguity.

## During coding

* Keep scope focused.
* Follow existing conventions.
* Implement complete behavior.
* Add/update relevant tests.

## After coding

* Run verification.
* Review the diff.
* Check for accidental changes.
* Summarize results.
* Stop.

---

# 66. Required Completion Report

After completing a development task, report:

### Implemented

What was changed.

### Files

Important files created or modified.

### Verification

Commands/tests executed and their results.

### Decisions

Any non-obvious implementation decisions.

### Remaining

Anything intentionally left unfinished.

### Issues

Any blocker, warning, or uncertainty.

Keep the report concise.

---

# 67. Do Not Advance Automatically

When a milestone or requested task is complete:

```text
STOP
```

Do not begin the next milestone.

Wait for developer review and instruction.

This applies even if `PLAN.md` clearly defines the next step.

---

# 68. Handling Ambiguity

Do not ask questions for trivial implementation details that can be safely inferred from established repository conventions.

Do ask before proceeding when ambiguity affects:

* business behavior;
* security;
* data model;
* API contract;
* user flow;
* significant architecture;
* destructive changes;
* MVP scope.

---

# 69. Security Review

Treat authentication, authorization, file access and secrets as security-sensitive.

When modifying these areas:

* inspect carefully;
* test negative cases;
* avoid permissive defaults;
* verify backend enforcement.

Never weaken security merely to simplify frontend integration.

---

# 70. Performance

Optimize obvious inefficiencies when they materially affect the current feature.

Do not add caching, queues or infrastructure based only on hypothetical scale.

Expected MVP usage is small.

Correctness and simplicity are more important than theoretical high-scale optimization.

---

# 71. Production Mindset

Although the MVP is small, code should be suitable for real users.

Avoid:

* hardcoded development credentials;
* hidden assumptions;
* silent failures;
* insecure shortcuts;
* mock data leaking into production;
* development-only behavior enabled in production.

---

# 72. Definition of Done

A requested implementation is complete only when:

1. Requirements are satisfied.
2. Scope is respected.
3. Code compiles.
4. Relevant tests pass.
5. Error states are considered.
6. Security rules are respected.
7. Mobile behavior is considered when applicable.
8. No unrelated changes were introduced.
9. The diff was reviewed.
10. Results were reported to the developer.

---

# 73. Final Rule

When choosing between:

```text
a clever solution
```

and:

```text
a simple solution that clearly satisfies the documented requirement
```

choose the simple solution.

The objective is not to demonstrate architectural sophistication.

The objective is to build a reliable, maintainable application that solves the client's problem.
