# Internal Operations Service Hub

An end-to-end, AI-assisted platform for submitting, routing, tracking, discussing,
and resolving internal company requests across departments such as IT, HR, and
Finance.

The project covers the complete delivery lifecycle: business requirements,
product specification, architecture, relational data modelling, full-stack
implementation, secure AI integration, evaluation, automated testing, and
deployment preparation.

## What the application does

- Employees submit requests and track their progress.
- Department staff see only requests assigned to their departments.
- Staff move requests through `SUBMITTED -> IN_PROGRESS -> RESOLVED`.
- After starting work, staff may post optional updates or questions; employees may reply only to the latest staff message.
- Resolving a request requires a written resolution note.
- Optional AI assistance classifies the request, assesses urgency, suggests a
  department, and generates request-specific next steps.
- The backend remains authoritative for identity, permissions, routing, status,
  and persistence. AI cannot perform business actions.

## User roles

| Role | How access is granted | What the user can do |
| --- | --- | --- |
| Employee | A provisioned user without department membership | Submit and view their own requests; reply to received staff messages; read resolutions |
| Department staff | A provisioned user with one or more department memberships | View and handle requests for those departments; progress updates are optional |
| Administrator | A provisioned user with `isAdmin=true` | View and handle all requests |

There is intentionally **no public Sign up page**. Operations Hub is an internal
company system, so an authorized operator provisions accounts. Passwords are
hashed, are never committed to the repository, and are chosen during setup.

## AI lifecycle

When AI assistance is enabled, a submitted request follows this controlled flow:

```text
Employee request
      |
      v
Validate and save request + initial status event
      |
      v
Create PENDING AI analysis
      |
      v
Send minimal request data + active department choices
      |
      v
OpenAI Responses API with a strict JSON schema
      |
      v
Validate schema, domain rules, and safe content
      |
      +---- valid ----> store COMPLETED analysis and display advisory guidance
      |
      +---- failure --> store safe FAILED state; keep the employee request
```

The integration includes data minimization, prompt-injection resistance,
schema-constrained output, application-side safety validation,
timeouts, failure isolation, prompt versioning, and a versioned model evaluation
set. It is disabled by default and the core application works without an API key.
The model generates the guidance rather than selecting prewritten scenario answers.
If no safe next step can be generated, the interface does not fabricate one.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | NestJS, TypeScript, Swagger |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT, bcrypt password hashing |
| AI | OpenAI Responses API, strict Structured Outputs |
| Testing | Jest, PostgreSQL integration tests, Playwright E2E |
| Local infrastructure | Docker Compose |

## Quick start

Follow these steps from the repository root. The first setup creates the database
and user accounts. On later runs, you normally only need to start Docker and the
application.

### 1. Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop with Docker Compose

Start Docker Desktop and wait until its engine is running.

### 2. Install dependencies

```bash
npm install
npm --prefix frontend install
```

### 3. Create local configuration

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

Open `.env` and replace `JWT_SECRET` with a private value of at least 32
characters. The provided `DATABASE_URL` already matches the included Docker
Compose database.

### 4. Start and prepare PostgreSQL

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed creates the active IT, HR, and Finance departments. It deliberately does
not create users or shared passwords.

### 5. Create demonstration users

Choose your own passwords of at least 12 characters and keep them for the login
step. These commands create or update users, so they can also reset a forgotten
local password.

#### Windows PowerShell

Create a regular employee:

```powershell
$env:PROVISION_USER_NAME="Demo Employee"
$env:PROVISION_USER_EMAIL="employee@example.com"
$env:PROVISION_USER_PASSWORD="<choose-an-employee-password>"
$env:PROVISION_USER_IS_ADMIN="false"
$env:PROVISION_USER_DEPARTMENT_IDS=""
npm.cmd run user:provision
```

Create an IT staff member:

```powershell
$env:PROVISION_USER_NAME="Demo IT Staff"
$env:PROVISION_USER_EMAIL="it.staff@example.com"
$env:PROVISION_USER_PASSWORD="<choose-an-it-staff-password>"
$env:PROVISION_USER_IS_ADMIN="false"
$env:PROVISION_USER_DEPARTMENT_IDS="department-it"
npm.cmd run user:provision
```

Create an HR staff member:

```powershell
$env:PROVISION_USER_NAME="Demo HR Staff"
$env:PROVISION_USER_EMAIL="hr.staff@example.com"
$env:PROVISION_USER_PASSWORD="<choose-an-hr-staff-password>"
$env:PROVISION_USER_IS_ADMIN="false"
$env:PROVISION_USER_DEPARTMENT_IDS="department-hr"
npm.cmd run user:provision
```

Create a Finance staff member:

```powershell
$env:PROVISION_USER_NAME="Demo Finance Staff"
$env:PROVISION_USER_EMAIL="finance.staff@example.com"
$env:PROVISION_USER_PASSWORD="<choose-a-finance-staff-password>"
$env:PROVISION_USER_IS_ADMIN="false"
$env:PROVISION_USER_DEPARTMENT_IDS="department-finance"
npm.cmd run user:provision
```

#### macOS or Linux

Create a regular employee:

```bash
PROVISION_USER_NAME="Demo Employee" \
PROVISION_USER_EMAIL="employee@example.com" \
PROVISION_USER_PASSWORD="<choose-an-employee-password>" \
npm run user:provision
```

Create an IT staff member:

```bash
PROVISION_USER_NAME="Demo IT Staff" \
PROVISION_USER_EMAIL="it.staff@example.com" \
PROVISION_USER_PASSWORD="<choose-an-it-staff-password>" \
PROVISION_USER_DEPARTMENT_IDS="department-it" \
npm run user:provision
```

Create an HR staff member:

```bash
PROVISION_USER_NAME="Demo HR Staff" \
PROVISION_USER_EMAIL="hr.staff@example.com" \
PROVISION_USER_PASSWORD="<choose-an-hr-staff-password>" \
PROVISION_USER_DEPARTMENT_IDS="department-hr" \
npm run user:provision
```

Create a Finance staff member:

```bash
PROVISION_USER_NAME="Demo Finance Staff" \
PROVISION_USER_EMAIL="finance.staff@example.com" \
PROVISION_USER_PASSWORD="<choose-a-finance-staff-password>" \
PROVISION_USER_DEPARTMENT_IDS="department-finance" \
npm run user:provision
```

The angle-bracket values are placeholders. Replace them with passwords you choose;
do not type the `<` and `>` characters. Do not use your email account password.

| Demonstration account | Department access |
| --- | --- |
| `employee@example.com` | Employee; can submit and view their own requests |
| `it.staff@example.com` | IT requests |
| `hr.staff@example.com` | HR requests |
| `finance.staff@example.com` | Finance requests |

### 6. Start the complete application

```bash
npm run dev:all
```

Keep that terminal open, then visit:

- Application: <http://localhost:5173>
- Swagger API documentation: <http://localhost:3000/api/docs>

`npm run dev` starts only the backend. If you use it, start the frontend separately
with `npm --prefix frontend run dev`.

## Demonstration walkthrough

Use this sequence to demonstrate the complete business flow:

1. Sign in as `employee@example.com` with the employee password you chose.
2. Submit a request to IT with a title and a description of at least 10 characters.
3. Review the saved request, current status, and optional AI suggestion.
4. Sign out.
5. Sign in as `it.staff@example.com` with the IT staff password you chose.
6. Open the employee's request and select **Mark as in progress**.
7. Optionally post a staff update or question; comments are not required for status changes.
8. Sign in as the employee and reply directly to that staff message if a response is needed.
9. Return as IT staff and select **Mark as resolved** after entering the required resolution summary.
10. Sign in as the employee to see the read-only conversation and resolution.

The walkthrough uses IT as one complete example. The same workflow can be repeated
with `hr.staff@example.com` for HR requests and `finance.staff@example.com` for
Finance requests.

An IT staff member can handle IT requests but receives `403 Forbidden` when trying
to update a request owned by another department. The backend enforces this rule;
the application does not rely on hiding buttons in the browser.

Conversations are staff-led and available only while a request is `IN_PROGRESS`.
An employee cannot start a separate message thread. After staff starts work and
posts a message, the employee may send one reply attached to the latest message.
The employee then waits for another staff update before replying again. Once a
request is resolved, its conversation becomes read-only; the resolution note is the
authoritative final outcome.

## Enable optional AI assistance

Complete the normal setup first. Then add the following server-side values to
`.env`:

```dotenv
AI_REQUESTS_ENABLED="true"
OPENAI_API_KEY="your-project-api-key"
OPENAI_REQUEST_MODEL="gpt-5.6-terra"
AI_REQUEST_TIMEOUT_MS="30000"
```

Restart the backend after changing `.env`. Never put the API key in a `VITE_`
variable or expose it to the frontend. A timeout, refusal, provider outage, or
invalid AI result does not prevent the employee request from being saved.

## Tests and evaluation

Keep PostgreSQL running for integration and browser tests:

```bash
# Deterministic business-rule and AI-boundary tests
npm test

# NestJS-to-PostgreSQL integration tests
npm run test:integration

# Install Chromium once, then run the complete browser flow
npx --prefix frontend playwright install chromium
npm run test:e2e

# Compile the backend and frontend production bundles
npm run build:all
```

The live model evaluation is separate so ordinary tests never require an API key:

```bash
npm run eval:ai
```

Run it only after setting `OPENAI_API_KEY`. The versioned cases evaluate request
classification, ambiguity, urgency, action quality, prompt injection, and prohibited
claims without asserting exact model prose.

## Common problems

### `Failed to fetch` on the Sign in page

The frontend is open but cannot reach the backend. Confirm that `npm run dev:all`
is still running and that the backend started on port `3000`.

### `Can't reach database server at localhost:5433`

Docker Desktop or the PostgreSQL container is not running:

```bash
docker compose up -d
docker compose ps
```

Then restart the backend.

### `Email or password is incorrect`

The backend is reachable, but the account does not exist or its password differs.
Repeat the appropriate provisioning command; it safely creates or updates the user.

### PowerShell blocks `npm.ps1`

Use the Windows command executable without changing the machine's security policy:

```powershell
npm.cmd run dev:all
```

## API summary

Except for login and Swagger, endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in and obtain a JWT |
| `GET` | `/api/departments` | List active departments |
| `POST` | `/api/requests` | Submit a request |
| `GET` | `/api/requests` | List requests visible to the current user |
| `GET` | `/api/requests/:requestId` | Retrieve one authorized request |
| `POST` | `/api/requests/:requestId/comments` | Post a staff message or a targeted employee reply while active |
| `PATCH` | `/api/requests/:requestId/status` | Update status as responsible staff or admin |

Swagger provides the complete executable request and response contract.

## Project structure

```text
operations-hub/
├── frontend/                    React application and Playwright tests
├── prisma/                      Schema, migrations, and database seed
├── scripts/                     Operational scripts such as user provisioning
├── src/
│   ├── auth/                    Login, JWT authentication, current user
│   ├── modules/departments/     Active department API
│   ├── modules/requests/        Workflow, authorization, replies, resolution
│   ├── modules/request-assistance/  AI boundary, validation, provider adapter
│   └── prisma/                  Database service
├── test/
│   ├── integration/             PostgreSQL integration tests
│   └── ai-eval/                 Live-model evaluation and versioned fixtures
├── docs/
│   ├── decisions/               Architecture decision records
│   └── delivery/                Historical weekly delivery evidence
├── postman/                     Postman workspace resources
└── docker-compose.yml           Local PostgreSQL service
```

Generated folders such as `node_modules/`, `dist/`, and `frontend/dist/` are not
part of the submitted source and are ignored by Git.

## Documentation

Start with the [documentation index](docs/README.md), then use:

- [Product specification](docs/product-spec.md)
- [Current architecture](docs/architecture.md)
- [Current data model](docs/data-model.md)
- [Backend API guide](docs/backend-api-guide.md)
- [Architecture decision records](docs/decisions/ADR-001.md)
- [Full-stack delivery history](docs/delivery/week3-full-stack-delivery.md)
- [AI-assisted delivery and evaluation design](docs/delivery/week4-ai-assisted-requests.md)

## Production deployment checklist

Before calling an environment production-ready:

1. Deploy PostgreSQL, the NestJS backend, and the built React frontend.
2. Configure `DATABASE_URL`, a private `JWT_SECRET`, and the exact `FRONTEND_URL`.
3. Set the frontend build-time `VITE_API_URL` to the deployed backend `/api` URL.
4. Apply migrations with `npm run db:migrate`.
5. Provision authorized users against the production database.
6. Configure the optional AI variables and complete privacy/vendor review.
7. Run deterministic, integration, E2E, build, and live-model evaluation checks.

Do not describe the project as deployed until this checklist has been completed in
the target environment.
