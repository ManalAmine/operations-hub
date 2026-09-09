# Backend API Guide

## Summary

This NestJS API allows an employee to submit an internal request and move it
through this lifecycle:

```text
SUBMITTED -> IN_PROGRESS -> RESOLVED
```

The API has no frontend, authentication, or database. Requests are stored in
memory and are cleared when the server restarts.

## Main files

| File | Responsibility |
| --- | --- |
| `main.ts` | Starts NestJS and enables validation |
| `app.module.ts` | Loads the request module |
| `requests.module.ts` | Connects the controller and service |
| `requests.controller.ts` | Defines the API endpoints |
| `requests.service.ts` | Handles request creation, retrieval, and updates |
| `requests.data.ts` | Contains request types and mock data |
| `requests.lifecycle.ts` | Defines allowed status transitions |
| `dto/` | Validates submission and status-update bodies |

## Business rules

- Every new request starts at `SUBMITTED`.
- States cannot be skipped or moved backward.
- `RESOLVED` is the final state.
- Every status change is added to `statusHistory`.
- An invalid transition returns `409 Conflict`.

## Run the API

```bash
npm install
npm run dev
```

The API runs at `http://localhost:3000/api`.

## Test with Postman

Keep the NestJS terminal running while using Postman.

### 1. Submit a request

Method: `POST`

URL:

```text
http://localhost:3000/api/requests
```

Select **Body -> raw -> JSON** and enter:

```json
{
  "requesterId": "employee-123",
  "title": "Laptop cannot connect to VPN",
  "description": "The VPN connection times out after several seconds.",
  "departmentId": "department-it"
}
```

Click **Send**. The request starts at `SUBMITTED`. Copy the returned `id`.

### 2. Move it to IN_PROGRESS

Method: `PATCH`

URL, replacing `REQUEST_ID`:

```text
http://localhost:3000/api/requests/REQUEST_ID/status
```

Body:

```json
{
  "status": "IN_PROGRESS",
  "expectedCurrentStatus": "SUBMITTED"
}
```

### 3. Resolve it

Use the same PATCH URL with:

```json
{
  "status": "RESOLVED",
  "expectedCurrentStatus": "IN_PROGRESS"
}
```

### 4. View the completed request

Method: `GET`

```text
http://localhost:3000/api/requests/REQUEST_ID
```

The response should show `RESOLVED` and this history:

```text
null -> SUBMITTED
SUBMITTED -> IN_PROGRESS
IN_PROGRESS -> RESOLVED
```

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/requests/lifecycle` | View lifecycle rules |
| `POST` | `/api/requests` | Submit a request |
| `GET` | `/api/requests` | List requests |
| `GET` | `/api/requests/:requestId` | View one request |
| `PATCH` | `/api/requests/:requestId/status` | Update its status |
