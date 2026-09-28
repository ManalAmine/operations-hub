# Week 2 — Engineering Ownership and Workflow Proof

## Purpose

This document maps the implemented request workflow to the source and automated
proof a new engineer can inspect. It records engineering ownership rather than
introducing a second specification.

## Authoritative lifecycle

```text
SUBMITTED -> IN_PROGRESS -> RESOLVED
```

- New requests always begin at `SUBMITTED`.
- Only responsible department staff or administrators can advance status.
- States cannot be skipped, repeated, or moved backward.
- `expectedCurrentStatus` rejects stale updates.
- Resolution requires a non-empty resolution note.
- Each successful transition stores a status-history event transactionally.

The executable lifecycle is defined in
`src/modules/requests/requests.lifecycle.ts`; authorization and persistence are
owned by `src/modules/requests/requests.service.ts`.

## Valid behavior

1. A provisioned employee submits a valid request to an active department.
2. Responsible staff moves it from `SUBMITTED` to `IN_PROGRESS`.
3. Staff may post an optional message; the employee may reply once to the latest
   staff message.
4. Responsible staff supplies a resolution note and moves it to `RESOLVED`.
5. The employee sees the durable status history, conversation, and outcome.

## Invalid and unauthorized behavior

- Invalid or inactive departments are rejected.
- A different department cannot view, message, or update the request.
- Employees cannot update status or initiate a conversation.
- Staff cannot message a request before work starts.
- Stale, skipped, backward, and post-resolution updates are rejected.
- Duplicate or outdated employee replies are rejected.
- AI output cannot authenticate, authorize, route, update, or resolve a request.

## Decision and evidence map

| Concern | Direct evidence |
| --- | --- |
| Lifecycle definition | `src/modules/requests/requests.lifecycle.ts` |
| Authorization and stale-write protection | `src/modules/requests/requests.service.ts` |
| Durable current state and history | `prisma/schema.prisma` and `prisma/migrations/` |
| Lifecycle unit proof | `src/modules/requests/requests.lifecycle.spec.ts` |
| Database behavior | `test/integration/requests.integration-spec.ts` |
| Browser and API boundary proof | `frontend/e2e/service-request.spec.ts` |
| Status-history rationale | `docs/decisions/ADR-001.md` |

## Engineering handoff

The repository history preserves the evolution from specification and data model
through lifecycle implementation, full-stack integration, AI assistance, and
release ownership. A new engineer should start with `README.md`, then follow the
documentation index and run `npm run release:gate:core` with PostgreSQL available.
