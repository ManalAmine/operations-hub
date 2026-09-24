# Backend API Guide

The NestJS API persists service requests in PostgreSQL through Prisma. JWT authentication identifies the requester, and department membership controls status updates.

## Local endpoints

- API base: `http://localhost:3000/api`
- Interactive Swagger contract: `http://localhost:3000/api/docs`

## Request lifecycle

```text
SUBMITTED -> IN_PROGRESS -> RESOLVED
```

States cannot be skipped or moved backward. `expectedCurrentStatus` prevents an older browser state from overwriting a newer update. Every successful change creates a durable status event in the same database transaction. Moving to `RESOLVED` requires a non-empty `resolutionNote`.

## Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/departments` | Authenticated user |
| `GET` | `/api/requests/lifecycle` | Authenticated user |
| `POST` | `/api/requests` | Authenticated user |
| `GET` | `/api/requests` | Request owner, responsible staff, or admin |
| `GET` | `/api/requests/:requestId` | Request owner, responsible staff, or admin |
| `POST` | `/api/requests/:requestId/comments` | Staff message or targeted requester reply during `IN_PROGRESS` |
| `PATCH` | `/api/requests/:requestId/status` | Responsible department staff or admin |

Conversations are staff-led. Responsible staff and administrators post top-level
messages only after moving a request to `IN_PROGRESS`. The requester cannot
initiate a message; an employee request body must include `replyToCommentId` for a
staff message on the same request. Each staff message accepts at most one employee
reply, and only the latest staff message can be answered. Comments are not required
before a status change. Once the request is
`RESOLVED`, the API returns `409 Conflict` for new messages. Staff attempts while a
request is still `SUBMITTED` also return `409 Conflict`. A resolution note is
stored separately so the final outcome remains prominent and auditable.

Use Swagger for exact request bodies, response schemas, and validation responses. Setup and test commands are in the repository `README.md`.
