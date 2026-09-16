# Backend API Guide

The NestJS API persists service requests in PostgreSQL through Prisma. JWT authentication identifies the requester, and department membership controls status updates.

## Local endpoints

- API base: `http://localhost:3000/api`
- Interactive Swagger contract: `http://localhost:3000/api/docs`

## Request lifecycle

```text
SUBMITTED -> IN_PROGRESS -> RESOLVED
```

States cannot be skipped or moved backward. `expectedCurrentStatus` prevents an older browser state from overwriting a newer update. Every successful change creates a durable status event in the same database transaction.

## Endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/departments` | Authenticated user |
| `GET` | `/api/requests/lifecycle` | Authenticated user |
| `POST` | `/api/requests` | Authenticated user |
| `GET` | `/api/requests` | Request owner, responsible staff, or admin |
| `GET` | `/api/requests/:requestId` | Request owner, responsible staff, or admin |
| `PATCH` | `/api/requests/:requestId/status` | Responsible department staff or admin |

Use Swagger for exact request bodies, response schemas, and validation responses. Setup and test commands are in the repository `README.md`.
