# Internal Operations Service Hub

A small full-stack service request flow built with React, NestJS, Prisma, and PostgreSQL.

An employee can sign in, submit a request, and see its status. Staff can see requests for their department and move them through `SUBMITTED -> IN_PROGRESS -> RESOLVED`. The backend rejects status updates from staff in a different department.

## Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose

## Install and run

From the repository root:

```bash
npm install
npm --prefix frontend install
```

Copy `.env.example` to `.env`. The provided development values work with the included Docker Compose file. Change `JWT_SECRET` if this environment is shared.

Start PostgreSQL, apply the migration, and seed the demonstration data:

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
```

Start the backend and frontend together:

```bash
npm run dev:all
```

Open:

- Web application: http://localhost:5173
- Swagger API contract: http://localhost:3000/api/docs

To stop PostgreSQL without deleting its data:

```bash
docker compose stop
```

## Exercise the flow

All seeded accounts use the password `Password123!`.

| Account | Email | Purpose |
| --- | --- | --- |
| Alice Employee | `alice@example.com` | Submit and track requests |
| Ivan IT | `ivan@example.com` | Allowed to update IT requests |
| Hannah HR | `hannah@example.com` | Denied when updating IT requests |
| Farah Finance | `farah@example.com` | Handles Finance requests |
| Ada Admin | `ada@example.com` | Seeded for later work; no admin UI in this slice |

1. Sign in as Alice.
2. Submit a request to IT, HR, or Finance. A valid description must contain at least 10 characters.
3. Sign out and sign in as Ivan. Move the request to `IN_PROGRESS`.
4. The automated E2E test also signs in as Hannah through the API and verifies that her attempt to update the IT request returns `403 Forbidden`.

Submitting a short description returns `400 Bad Request`. Sending a status update with an old `expectedCurrentStatus` returns `409 Conflict`; the UI tells the user to refresh and try again.

## Automated tests

Keep the PostgreSQL container running and complete the migration and seed steps first.

```bash
# Business-rule and regression tests
npm test

# NestJS-to-PostgreSQL integration test
npm run test:integration

# Browser E2E test (first install the browser once)
npx --prefix frontend playwright install chromium
npm run test:e2e
```

The Playwright test starts the frontend and backend automatically. PostgreSQL must already be running.

Build both applications:

```bash
npm run build:all
```

## API summary

Except for login and Swagger, endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Obtain a JWT and current user |
| `GET` | `/api/departments` | List active departments |
| `POST` | `/api/requests` | Submit a request as the signed-in user |
| `GET` | `/api/requests` | List requests the user may access |
| `GET` | `/api/requests/:requestId` | Retrieve an authorized request |
| `PATCH` | `/api/requests/:requestId/status` | Update status as responsible department staff |

The complete interactive request and response contract is available in Swagger.

## Repository structure

```text
frontend/                 React and Playwright
prisma/                   schema, migration, and seed data
src/auth/                 JWT login and request authentication
src/modules/departments/  active department endpoint
src/modules/requests/     request lifecycle and authorization
test/                     database integration test
docs/                     product and delivery documentation
```

See [Week 3 full-stack delivery](docs/week3-full-stack-delivery.md) for the assignment evidence and design decisions.
