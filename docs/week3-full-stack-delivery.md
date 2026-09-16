# Week 3 Full-Stack Delivery

## Delivered slice

Version 0.3 delivers one narrow service request journey:

1. Alice Employee signs in with email and password.
2. Alice submits a request to the IT department.
3. PostgreSQL stores the request with an initial `SUBMITTED` status event.
4. Alice sees the request and its current status.
5. Ivan IT sees the request in the IT queue and moves it to `IN_PROGRESS`.

The implementation uses a React and TypeScript frontend, a NestJS backend, Prisma, PostgreSQL, and JWT bearer tokens. It intentionally excludes notifications, administration screens, external integrations, deployment, and other future features.

IT, HR, and Finance are seeded as active departments with department staff accounts. The demonstrated authorization scenario uses IT and HR.

## API contract

Swagger publishes the complete executable contract at `/api/docs`. DTO validation rejects unknown properties.

### Login

`POST /api/auth/login`

```json
{
  "email": "alice@example.com",
  "password": "Password123!"
}
```

The response contains an `accessToken` and a user object with `id`, `name`, `email`, `isAdmin`, and `departmentIds`.

### Create request

`POST /api/requests`

```json
{
  "title": "Laptop cannot connect to VPN",
  "description": "The VPN connection times out after several seconds.",
  "departmentId": "department-it"
}
```

The requester is derived from the JWT rather than accepted from the request body. A successful response includes the request, department, current status, allowed next states, and status history.

### Update status

`PATCH /api/requests/:requestId/status`

```json
{
  "status": "IN_PROGRESS",
  "expectedCurrentStatus": "SUBMITTED"
}
```

Supported lifecycle:

```text
SUBMITTED -> IN_PROGRESS -> RESOLVED
```

## Authorization evidence

The meaningful authorization rule is: only an administrator or a member of the request's responsible department may update its status.

- Allowed: Ivan belongs to IT and can update an IT request.
- Denied: Hannah belongs to HR and receives `403 Forbidden` when she attempts to update the same IT request.

Request listing and detail access are also filtered: employees see their own requests and staff see requests for their departments.

## Deliberately rejected request

The backend returns `400 Bad Request` when required request data is invalid. The demonstrated invalid case is a description shorter than 10 characters. A nonexistent or inactive department is also rejected.

## Expected failure handling

Status updates include `expectedCurrentStatus`. If another update has already changed the request, the backend returns `409 Conflict` instead of overwriting newer state. The React UI displays a message asking the user to refresh and try again.

The current status update and its `RequestStatusEvent` are stored in one database transaction.

## Automated evidence

### Business rule and regression protection

`requests.lifecycle.spec.ts` verifies that:

- `SUBMITTED -> IN_PROGRESS` is allowed;
- `IN_PROGRESS -> RESOLVED` is allowed;
- skipping directly from `SUBMITTED` to `RESOLVED` is rejected;
- a resolved request cannot move backward.

### Backend/database integration

`requests.integration-spec.ts` uses PostgreSQL. It creates a request through `RequestsService`, retrieves it through Prisma, and verifies that both the request and initial status event were persisted.

### End-to-end flow

`service-request.spec.ts` drives the React application with Playwright. It signs in as Alice, submits an IT request, verifies the persisted request is displayed, proves Hannah receives `403`, signs in as Ivan, advances the request, and verifies the new status. It also verifies the stale status case returns `409`.

## Run and verify

Complete setup, demonstration credentials, test commands, and endpoints are documented in the repository `README.md`.

## Known boundaries

- Authentication uses seeded local users rather than a company identity provider.
- There is no password reset, registration, or account-management UI.
- There are no notifications or external integrations.
- There are no administration screens.
- This is a local development delivery; deployment and production infrastructure are out of scope.
