# Internal Operations Service Hub — Current Architecture

## Purpose and scope

Operations Hub is a full-stack internal service-request system. The delivered
application supports authenticated employees, department-based staff access,
request conversations, controlled status transitions, resolution notes, and
optional advisory AI interpretation.

This document describes the system that exists in the repository today. Planned
capabilities such as public registration, notification delivery, administration
screens, and external company identity integration are outside the delivered
runtime boundary.

## Actors

| Actor | Delivered access |
| --- | --- |
| Employee | Submit and view their own requests; reply to the latest staff message during `IN_PROGRESS` |
| Department staff | Start and handle departmental requests; optionally post messages during `IN_PROGRESS` |
| Administrator | View and update every request; optionally post messages during `IN_PROGRESS` |
| System operator | Configure the environment, migrate the database, and provision users |

Users do not self-register. The operator provisions accounts, and stored department
memberships determine staff authorization.

## System context

```text
Employee / Staff / Administrator
              |
              v
      React + TypeScript UI
              |
         HTTPS / JSON
              |
              v
       NestJS REST API
       |      |      |
       |      |      +--> OpenAI Responses API (optional)
       |      |
       |      +---------> JWT authentication and authorization
       |
       +----------------> PostgreSQL through Prisma
```

The React frontend never connects directly to PostgreSQL or OpenAI. All protected
operations and AI calls pass through the NestJS backend.

## Components and responsibilities

### React frontend

- Collects email/password login credentials.
- Stores the returned JWT for the active browser session.
- Displays only requests returned by the authorized backend API.
- Supports request creation, targeted replies to staff messages, status changes, and resolution notes.
- Presents validated AI content as an advisory suggestion.

The frontend improves usability but is not a security boundary.

### Authentication module

- Verifies bcrypt password hashes.
- Issues JWTs with an eight-hour lifetime.
- Derives the current user from the validated token.
- Rejects missing or invalid credentials.

The requester identity is taken from the JWT, never from a client-supplied user ID.

### Requests module

- Validates selected departments and request content.
- Enforces requester, department-membership, and administrator access.
- Owns the `SUBMITTED -> IN_PROGRESS -> RESOLVED` lifecycle.
- Uses an expected-current-status check to prevent stale updates.
- Stores status changes transactionally with their history event.
- Requires a resolution note for `RESOLVED`.
- Enforces staff-led turn-taking during `IN_PROGRESS`: staff post top-level messages and the requester may reply once to the latest staff message.
- Closes the conversation on resolution.

### Request-assistance module

- Is isolated behind the application-owned `RequestInterpreter` interface.
- Builds a bounded prompt from request text, active departments, and request types.
- Calls the OpenAI Responses API only when the feature flag is enabled.
- Requests strict schema-constrained output.
- Validates enums, field relationships, department IDs, action quality, and
  prohibited claims again at the application boundary.
- Normalizes provider failures without exposing provider error bodies or secrets.

AI output is advisory. It cannot authenticate a user, change permissions, reassign
a request, update its status, or resolve it.

### Prisma and PostgreSQL

- Persist users, department memberships, requests, status history, conversations,
  resolution notes, and optional AI analyses.
- Enforce unique identities and relationship constraints.
- Preserve a request when AI is disabled or fails.

## Primary request flow

```text
1. Employee sends title, description, and selected department with a JWT.
2. Backend authenticates the employee and validates the input.
3. Backend loads active departments and rejects an invalid selection.
4. PostgreSQL stores the request and initial SUBMITTED event.
5. If AI is disabled, the saved request is returned immediately.
6. If AI is enabled, the backend creates a PENDING analysis and calls the model.
7. Valid output becomes a COMPLETED analysis.
8. Invalid output or provider failure becomes a safe FAILED analysis.
9. The request is returned in every AI outcome.
```

The AI call occurs after durable request creation. The employee's request therefore
survives a timeout, refusal, malformed result, or provider outage.

## Status-update flow

```text
Department staff request
          |
          v
Authenticate JWT
          |
          v
Verify membership for the request's department
          |
          v
Verify expected current status and allowed transition
          |
          v
Transaction: update Request + create RequestStatusEvent
```

A stale `expectedCurrentStatus` returns `409 Conflict` rather than overwriting a
newer change.

## Trust boundaries

### Browser input is untrusted

DTO validation rejects missing, malformed, and unknown fields. Authorization does
not rely on department IDs, requester IDs, or role claims supplied by the browser.

### Request text is untrusted model input

Employee text may contain prompt injection. The model instructions treat it only as
data, and application validation rejects unsupported contacts, URLs, guarantees,
SLAs, departments, and malformed output.

### Model input is minimized

Only the request text, selected department, active department choices, and bounded
request types are supplied. No prewritten scenario answers are sent to the model.
Passwords, JWTs, API keys, user identity, unrelated requests, memberships, and
unrestricted database content are excluded.

### Secrets remain server-side

`JWT_SECRET`, `DATABASE_URL`, and `OPENAI_API_KEY` belong to the backend environment.
The OpenAI key must never use a `VITE_` prefix.

## Failure behavior

| Failure | System behavior |
| --- | --- |
| Invalid login | Return an authentication error without revealing which field matched |
| Invalid request input | Reject before treating the request as submitted |
| Unauthorized access | Return `403 Forbidden` |
| Stale or invalid status transition | Return `409 Conflict` |
| Missing resolution note | Reject the resolution |
| Reply added after resolution | Return `409 Conflict`; keep the conversation read-only |
| Requester initiates a message | Return `400 Bad Request`; wait for a staff message |
| Staff messages before starting work | Return `409 Conflict`; move the request to `IN_PROGRESS` first |
| Duplicate reply to one staff message | Return `409 Conflict` |
| Reply to an outdated staff message | Return `400 Bad Request`; answer the latest message |
| Database unavailable | Do not report the operation as successful |
| AI disabled | Save and return the normal request without an analysis |
| AI timeout, refusal, outage, or invalid output | Preserve the request and record a safe failed analysis |

## External dependencies

- PostgreSQL is required for application operation.
- OpenAI is optional and controlled by `AI_REQUESTS_ENABLED`.
- Docker Compose provides PostgreSQL for local development only.
- No external notification provider or company identity provider is currently
  integrated.

## Verification strategy

- Unit tests cover lifecycle rules, bounded model context, provider parsing,
  and application-level AI validation.
- PostgreSQL integration tests cover persistence, AI success/failure isolation,
  conversations, and required resolution notes.
- Playwright covers the employee-to-staff browser journey and authorization errors.
- A separate live-model evaluation checks probabilistic AI behavior without making
  ordinary tests depend on an API key.

## Related documents

- [Product specification](product-spec.md)
- [Data model](data-model.md)
- [Backend API guide](backend-api-guide.md)
- [Status-history decision](decisions/ADR-001.md)
- [Detailed AI delivery and evaluation design](delivery/week4-ai-assisted-requests.md)
