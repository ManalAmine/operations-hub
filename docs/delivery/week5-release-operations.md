# Week 5 Release and Production Operations

## 1. Release outcome

Operations Hub is deployed from the public `ManalAmine/operations-hub` repository
through the `operations-hub-production` Render Blueprint. The live release keeps
the Week 1-4 design, lifecycle, full-stack, and bounded-AI behavior visible while
adding an operator-owned deployment and recovery path.

| Surface | Production target |
| --- | --- |
| User application | <https://operations-hub-manalamine.onrender.com> |
| Backend API | <https://operations-hub-api-manalamine.onrender.com/api> |
| Swagger | <https://operations-hub-api-manalamine.onrender.com/api/docs> |
| Process liveness | <https://operations-hub-api-manalamine.onrender.com/api/health/live> |
| Database readiness | <https://operations-hub-api-manalamine.onrender.com/api/health/ready> |

The exact submitted release is the Git commit SHA named in the submission email.
The same SHA is visible in GitHub and on the Render deploy record, allowing an
operator to match source, configuration, and the running release.

## 2. Production topology and configuration

`render.yaml` is the versioned infrastructure definition. It creates:

1. A PostgreSQL 17 database in Render's Frankfurt region.
2. A free Node web service for the NestJS API in Frankfurt.
3. A global static site containing the Vite production build.

The frontend sends all protected operations to the API. The API owns JWT
authentication, authorization, lifecycle validation, PostgreSQL persistence, and
the optional OpenAI boundary. The browser never receives database or OpenAI
credentials.

| Variable | Owner | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Render database reference | Prisma connection used by the API |
| `JWT_SECRET` | Render-generated secret | Signs authentication tokens |
| `FRONTEND_URL` | API environment | Exact allowed browser origin |
| `VITE_API_URL` | Static-site build | Public API base ending in `/api` |
| `OPENAI_API_KEY` | API secret | Server-side provider authentication |
| `AI_REQUESTS_ENABLED` | Blueprint | Enables bounded AI analysis for new requests |
| `OPENAI_REQUEST_MODEL` | Blueprint | Pins the evaluated model configuration |
| `AI_REQUEST_TIMEOUT_MS` | Blueprint | Bounds provider latency |

Secrets are entered in Render and are not committed. The API build runs Prisma
client generation and the NestJS compiler. Startup applies committed migrations,
runs the idempotent department seed, and then starts the server on Render's bound
port and `0.0.0.0`.

## 3. Release gate

From a configured engineer workstation with PostgreSQL running:

```bash
npm ci
npm --prefix frontend ci
npm run db:generate
npm run release:gate
```

`release:gate` combines unit tests, PostgreSQL integration tests, backend and
frontend production builds, Playwright E2E, and the live-model AI evaluation. The
live AI evaluation requires a valid server-side `OPENAI_API_KEY`. When provider
access is intentionally unavailable, `npm run release:gate:core` runs the complete
deterministic gate and `npm run eval:ai` remains an explicitly reported separate
check.

Before submission, record the immutable release identifier:

```bash
git rev-parse HEAD
git status --short
```

The status output must be empty. Push that commit, deploy the same commit through
the Blueprint, and use its full SHA in the handoff email. Later commits are not
part of the frozen submission unless the academy explicitly requests them.

The September 30, 2026 release-candidate verification produced:

- 22 passing deterministic unit tests across five suites;
- 6 passing PostgreSQL integration tests;
- successful NestJS and Vite production builds;
- 1 passing Playwright critical-journey test; and
- 10 of 10 passing live-model evaluation cases.

## 4. Deployment procedure

1. Review `render.yaml` and confirm the plans and region do not introduce an
   unintended cost.
2. Push the release candidate to `main`.
3. Open the `operations-hub-production` Blueprint and run a manual sync.
4. Confirm the database, API, and static site complete successfully.
5. Confirm the API deploy record references the intended Git SHA.
6. Check `/api/health/live` and `/api/health/ready` for HTTP 200.
7. Open the live application and execute the post-deploy smoke test.

Automatic deploys are disabled. This makes the release an explicit operator action
and prevents an unrelated later push from silently replacing the defended build.

## 5. Health, logs, and monitoring

`GET /api/health/live` proves that the API process can serve HTTP. It does not
depend on PostgreSQL and is suitable for distinguishing a dead process from a
dependency outage.

`GET /api/health/ready` executes a bounded database query. It returns HTTP 200 with
`database: up` when the API can use PostgreSQL and HTTP 503 when the dependency is
unavailable. Render uses this endpoint as the web-service health check.

Operators use the Render service pages for:

- **Deploys:** deployed SHA, build output, deploy duration, and rollback target.
- **Logs:** migration, seed, Nest startup, readiness, and AI-provider failures.
- **Metrics:** CPU, memory, request, and database resource signals.
- **Database:** availability, storage usage, connections, credentials, and expiry.

Free web services may sleep after inactivity. A slow first request of roughly one
minute can therefore be a cold start rather than a failure. Retry after the service
wakes, then use readiness and logs if it does not recover.

## 6. Failure and recovery runbook

### API unavailable

1. Check the current Render deploy state and `/api/health/live`.
2. Inspect build and runtime logs for the first concrete error.
3. Correct configuration or deploy the last known-good Git commit.
4. Wait for liveness and readiness to return HTTP 200.
5. Repeat the critical-path smoke test.

### Database unavailable or credential rotated

1. Confirm database status in Render without exposing its connection string.
2. Rotate or replace the credential when compromise is suspected.
3. Update the API's `DATABASE_URL` with the database's **Internal Database URL**.
4. Redeploy the API and confirm migrations report no unexpected pending change.
5. Confirm readiness returns HTTP 200 and `database: up`.
6. Delete the superseded credential only after the recovered API is healthy.
7. Sign in and verify the critical request journey.

This sequence was exercised during release preparation: a database credential was
rotated, the API configuration was updated, the service redeployed successfully,
and readiness returned HTTP 200 before the previous credential was retired. No
credential value is retained as evidence.

### AI unavailable

AI executes only after the employee request is durably saved. A missing key,
timeout, refusal, invalid response, or provider outage records a safe failed
analysis without losing the request. Verify `AI_REQUESTS_ENABLED`, the presence of
the server-side key, API logs, and provider availability. The core request
lifecycle remains usable while AI is unavailable.

### Frontend cannot reach the API

Check `VITE_API_URL`, `FRONTEND_URL`, API readiness, and browser network errors.
Because Vite embeds its URL at build time, changing `VITE_API_URL` requires a new
static-site build and deploy.

## 7. Post-deploy smoke proof

The following production journey was completed on September 30, 2026:

1. The frontend, Swagger, liveness, and database readiness endpoints were reachable.
2. `employee@example.com` submitted an IT VPN request.
3. AI completed a bounded `IT network` analysis with normal urgency and safe next
   steps; it remained explicitly advisory.
4. `it.staff@example.com` moved the request to `IN_PROGRESS` and posted an update.
5. The employee saw the update and posted one targeted reply.
6. IT supplied a required resolution note and moved the request to `RESOLVED`.
7. The employee saw the complete read-only conversation, AI analysis, and outcome.
8. HR and Finance staff accounts were used to verify department-scoped access and
   could not see the IT request.

The production demo accounts and critical journey are documented in the root
README so a stranger can reproduce this proof without verbal guidance.

## 8. Rollback and post-recovery verification

For an application regression, choose the last known-good Git commit in Render's
deploy history and redeploy that exact commit. Do not roll the database backward
by deleting migrations. If a schema change requires remediation, deliver a new
forward migration and test it against a backup or disposable environment first.

After any rollback or recovery:

1. Verify liveness and readiness.
2. Sign in with an employee demo account.
3. Load the request list and an existing request.
4. Sign in as the responsible department and verify scoped visibility.
5. Exercise one allowed state transition or message on disposable test data.
6. Confirm unauthorized departments still cannot access that request.

## 9. Availability and ownership limits

The current Render plans are free. The API can cold-start, and the PostgreSQL
database is scheduled to expire on October 28, 2026 unless upgraded. The owner must
keep the application and database reachable through the defense, monitor the
expiry date, avoid exposing secrets in screenshots or logs, and rotate any
credential that may have been disclosed.
