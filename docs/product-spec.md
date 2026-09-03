# Internal Operations Service Hub

## Product

A company-internal system for requesting and tracking help from departments such as IT, HR, and Finance.

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

An authorized user who manages departments and user roles or access permissions.

## 4. Functional Requirements

- **FR-01:** The system must allow an employee to submit an internal help request.
- **FR-02:** Each request must be associated with a responsible department.
- **FR-03:** The system must allow an employee to view requests they have submitted.
- **FR-04:** The system must show the current status of each request.
- **FR-05:** Authorized department staff must be able to view requests assigned to their department.
- **FR-06:** Authorized users must be able to view the details of a request they are permitted to access.
- **FR-07:** Authorized department staff must be able to update a request's status.
- **FR-08:** The system must support marking a request as resolved.
- **FR-09:** The system must notify the responsible department when a new request requires its attention.
- **FR-10:** The system must notify the requester when an important change occurs to their request, including a status change or resolution.
- **FR-11:** Authorized administrators must be able to manage departments,department membership and access permissions.

## 5. Non-Functional Requirements

- **Security:** Protected request information must only be accessible to authorized users.
- **Usability:** Employees should be able to submit and track a request without technical knowledge.
- **Reliability / Data Integrity:** Once a request or status update is successfully saved, its latest saved state must remain available when the request is retrieved again.
- **Notification Security:** Notifications must only be sent to the intended authorized recipients.

## 6. Assumptions, Constraints, and Unknowns

### Assumptions

- A request has one responsible department at a time.
- Each department has authorized staff who handle its requests.
- Users have some form of company identity for accessing the internal system.

### Constraints

- The product is intended for internal company use.
- No additional technical or platform constraints have been specified yet.

### Unknowns

- How is the responsible department selected or assigned?
- Can a request move between departments?
- Can a requester edit, cancel, or reopen a request?
- Are comments or attachments required?
- Are priority levels or service-level targets required?
- What notification channels should be used, such as email, in-app notifications, or both?

## 7. Non-Goals

For the current scope, the product does not include:

- external customer support;
- AI-based routing or automatic resolution;
- advanced analytics or reporting;
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
**then** the requester can see that the request is resolved.

### AC-05 — Protect Unauthorized Requests

**Given** a user who is not authorized to access a request,  
**when** they attempt to view or modify it,  
**then** the system prevents access to the protected request information.

### AC-06 — Required Information

**Given** an employee creating a request,  
**when** required information is missing,  
**then** the system does not treat the request as successfully submitted.

### AC-07 — Notify the Responsible Department

**Given** a request has been successfully submitted and associated with a responsible department,  
**when** the request requires that department's attention,  
**then** the appropriate department staff are notified.

### AC-08 — Notify the Requester

**Given** an employee has submitted a request,  
**when** an important change such as a status update or resolution occurs,  
**then** the requester is notified of the change.

### AC-09 — Administrator Management

**Given** an authorized administrator,  
**when** they manage a department ,department membership or administrator access,  
**then** the change is saved and the updated permission is applied by the system.