# Internal Operations Service Hub — Delivered Product Specification

## Product

A company-internal system for requesting and tracking help from departments such as IT, HR, and Finance.

## Delivery Scope

This specification describes the current delivered application: authenticated request
submission and tracking, department-based authorization, controlled status
transitions, request conversations, required resolution notes, and optional
AI-assisted interpretation.

Notification delivery, administration screens, external company identity
integration, and public registration are not part of the current runtime. They
remain future product capabilities rather than implemented features. See the
[current architecture](architecture.md) and [current data model](data-model.md) for
the exact delivered boundary.

## 1. Problem / Context

Employees need a clear and consistent way to request and track help from internal departments such as IT, HR, and Finance.

The product should allow an employee to submit an internal request, associate it with the responsible department, track its progress, and see when it has been resolved.

## 2. Known Facts

- The product is a company-internal system.
- It is used for requesting and tracking help.
- Departments include examples such as IT, HR, and Finance.
- Employees need to be able to track internal requests.

## 3. Actors / Stakeholders

### Employee / Requester

A company employee who needs help from an internal department.

### Service Department Staff

Staff in departments such as IT, HR, or Finance who handle requests assigned to their department.

### Administrator

An authorized user who can view and handle requests across every department.

### System Operator

An operator who configures the environment and provisions users, department
memberships, and administrator access through the repository script.

## 4. Functional Requirements

- **FR-01:** The system must allow an employee to submit an internal help request.
- **FR-02:** Each request must be associated with a responsible department.
- **FR-03:** The system must allow an employee to view requests they have submitted.
- **FR-04:** The system must show the current status of each request.
- **FR-05:** Authorized department staff must be able to view requests assigned to their department.
- **FR-06:** Authorized users must be able to view the details of a request they are permitted to access.
- **FR-07:** Authorized department staff must be able to update a request's status.
- **FR-08:** The system must support marking a request as resolved.
- **FR-09:** After a request is saved, the system may generate advisory AI assistance containing a bounded request type, summary, clarification state, urgency, department suggestion, and request-specific next steps.
- **FR-10:** AI assistance must not change request status, permissions, department assignment, or other authoritative business data.
- **FR-11:** The AI panel must show the validated request type, urgency, routing guidance, and safe model-generated actions the employee can take now. It must not repeat the request or display a generated follow-up question. If clarification is needed, employees see a short explanation and responsible staff decide whether to ask for details through the controlled conversation. If no safe action exists, the panel must omit that section instead of inventing company-specific guidance.
- **FR-12:** After moving a request to `IN_PROGRESS`, responsible department staff or an administrator may start an optional conversation message. The requester may reply once to the latest staff message but may not initiate a separate message or answer an outdated message. `SUBMITTED` and `RESOLVED` requests do not accept messages.
- **FR-13:** Resolving a request must require a written resolution note that is visible to the requester and responsible staff.
- **FR-14:** Users must be explicitly provisioned; the application must not expose public registration, shared demo passwords, or plaintext stored passwords.

## 5. Non-Functional Requirements

- **Security:** Protected request information must only be accessible to authorized users.
- **Usability:** Employees should be able to submit and track a request without technical knowledge.
- **Reliability / Data Integrity:** Once a request or status update is successfully saved, its latest saved state must remain available when the request is retrieved again.
- **AI Reliability:** AI failure must not undo or prevent an otherwise valid request submission.
- **AI Data Minimization:** Only request text and the bounded department and request-type choices needed for interpretation may be sent to the AI provider.

## 6. Assumptions, Constraints, and Unknowns

### Assumptions

- A request has one responsible department at a time.
- Each department has authorized staff who handle its requests.
- Users receive a provisioned local account for accessing the internal system.

### Constraints

- The product is intended for internal company use.
- No additional technical or platform constraints have been specified yet.

### Unknowns

- Whether a future version should support notifications and which channels it should use.
- Whether a future version should support request reassignment, editing, cancellation, or reopening.
- Whether file attachments, operational priority, or service-level targets are needed.
- Whether administration should move from the provisioning script into a dedicated UI.

## 7. Non-Goals

For the current scope, the product does not include:

- external customer support;
- email, push, or in-application notification delivery;
- administration screens for users, memberships, or departments;
- public registration, password reset, or external identity-provider integration;
- request attachments, editing, cancellation, reopening, or department reassignment;
- operational priority queues, SLA timers, or escalation automation;
- automatic, unreviewed AI routing or resolution;
- advanced analytics or reporting;
- production hosting infrastructure;
- integrations or additional features that have not been specified.

## 8. Acceptance Criteria

### AC-01 — Submit a Request

**Given** an authorized employee,  
**when** they submit a request with the required information,  
**then** the request is created and appears in their submitted requests.

### AC-02 — Track a Request

**Given** an employee who has submitted a request,  
**when** they open that request,  
**then** they can see its current status and responsible department.

### AC-03 — Department Handles a Request

**Given** an authorized department staff member,  
**when** a request is assigned to their department,  
**then** they can view the request and update its status.

### AC-04 — Resolve a Request

**Given** a request that has been handled,  
**when** an authorized department staff member marks it as resolved,  
**then** a resolution note is required and the requester can see both the resolved status and the final outcome.

### AC-05 — Protect Unauthorized Requests

**Given** a user who is not authorized to access a request,  
**when** they attempt to view or modify it,  
**then** the system prevents access to the protected request information.

### AC-06 — Required Information

**Given** an employee creating a request,  
**when** required information is missing,  
**then** the system does not treat the request as successfully submitted.

### AC-07 — AI-Assisted Interpretation

**Given** AI assistance is enabled and an employee submits a valid request,
**when** the configured model returns a valid schema-constrained result,
**then** the request stores and displays the validated advisory result, clearly labels missing information, and leaves all business decisions to authorized staff.

### AC-08 — AI Failure Isolation

**Given** an employee submits a valid request,
**when** the AI provider times out, refuses, is unavailable, or returns invalid output,
**then** the request remains submitted and the AI analysis records a safe failure state.

### AC-09 — Request Conversation

**Given** an authorized staff message on an `IN_PROGRESS` request,
**when** the requester submits a non-empty reply to the latest staff message,
**then** the reply is linked to the staff message, stored with its author and timestamp, and visible to the authorized participants.

### AC-10 — Resolution Note

**Given** a request in progress,
**when** responsible staff or an administrator resolves it,
**then** the operation is rejected without a resolution note and stores the note when resolution succeeds.

### AC-11 — Closed Conversation

**Given** a resolved request,
**when** an employee, responsible department staff member, or administrator attempts to add another reply,
**then** the operation is rejected and the existing conversation remains read-only.

### AC-12 — Staff-Led Conversation

**Given** a request with no staff message,
**when** the requester attempts to initiate a conversation message,
**then** the operation is rejected; after staff posts a message, the requester may reply once to the latest message.

### AC-13 — Conversation Phase

**Given** a request that is still `SUBMITTED`,
**when** staff attempts to post a message,
**then** the operation is rejected until staff moves the request to `IN_PROGRESS`.

### AC-14 — Provisioned Access

**Given** an operator provisions a user with a password and optional department memberships,
**when** the user signs in with those credentials,
**then** the resulting access is derived from the stored account, membership, and administrator settings.
