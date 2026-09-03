Yes — the code block was probably making it annoying to copy. I’ll put the whole thing in **one editable writing block** so you can copy it directly.

# Internal Operations Service Hub — Architecture Draft

## 1. Purpose

The architecture describes the major actors, components, responsibilities, system boundaries, important data flows, external dependencies, trust and authorization points, communication decisions, and failure behavior needed to satisfy the requirements from the product specification.

---

## 2. Requirements Driving the Architecture

The architecture is based directly on the requirements from the product specification.

| Requirement                             | Architectural Need                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| FR-01 — Submit a request                | The system needs an interface, backend request handling, validation, and storage.                   |
| FR-02 — Responsible department          | A request must keep its responsible department.                                                     |
| FR-03 / FR-04 — View and track requests | The system must retrieve a requester's submitted requests and current status.                       |
| FR-05 — Department staff view requests  | The system must control access based on the responsible department.                                 |
| FR-06 — View request details            | Authorized users must be able to retrieve request details they are permitted to access.             |
| FR-07 / FR-08 — Update and resolve      | Authorized department staff must be able to change and save request status.                         |
| FR-09 — Notify responsible department   | The system must trigger a notification when a new request requires a department's attention.        |
| FR-10 — Notify requester                | The system must trigger a notification when an important change occurs to a request.                |
| FR-11 — Administration                  | Authorized administrators must be able to manage departments and user roles or access permissions.  |
| AC-05 — Unauthorized access             | Protected requests must be checked before they are viewed or modified.                              |
| AC-06 — Required information            | Invalid or incomplete requests must not be accepted as successfully submitted.                      |
| AC-07 / AC-08 — Notifications           | Notifications must be triggered for the correct recipients after relevant request events.           |
| AC-09 — Administrator management        | Administrative changes must only be performed by authorized administrators and must be saved.       |
| Security NFR                            | Only authenticated and authorized company users may access protected information.                   |
| Usability NFR                           | The user interface should allow employees to submit and track requests without technical knowledge. |
| Reliability / Data Integrity NFR        | Successfully submitted requests and their latest saved state must be stored reliably.               |
| Notification Security NFR               | Notifications must only be sent to intended authorized recipients.                                  |

---

## 3. Actors

### Employee / Requester

The employee:

* submits an internal help request;
* views requests they submitted;
* views permitted request details;
* sees the responsible department;
* tracks the current request status;
* receives notifications about important changes to their requests.

### Service Department Staff

Department staff:

* views requests assigned to their department;
* views permitted request details;
* updates request status;
* marks handled requests as resolved;
* receives notifications when new requests require their department's attention.

### Administrator

The administrator:

* manages departments;
* manages user roles or access permissions;
* performs administrative actions that normal employees and department staff are not authorized to perform.

---

## 4. System Boundary

```text
             Employee / Requester
             Department Staff
               Administrator
                    |
                    v
+--------------------------------------------------+
|        INTERNAL OPERATIONS SERVICE HUB           |
|                                                  |
|              +-------------+                     |
|              |   Web UI    |                     |
|              +------+------+                     |
|                     |                            |
|                     v                            |
|          +------------------------+              |
|          |  Application Backend   |              |
|          |                        |              |
|          | - validation           |              |
|          | - authorization        |              |
|          | - request handling     |              |
|          | - status handling      |              |
|          | - administration       |              |
|          | - notification trigger |              |
|          +-----------+------------+              |
|                      |                           |
|             +--------+---------+                 |
|             |                  |                 |
|             v                  v                 |
|   +--------------------+  +------------------+   |
|   | Durable Request    |  | Notification     |   |
|   | Store              |  | Service          |   |
|   +--------------------+  +------------------+   |
|                                                  |
+--------------------------------------------------+
                    |
                    | authentication
                    v
          +-------------------------+
          | Company Identity        |
          | Provider                |
          | External                |
          +-------------------------+
```

The **Web UI, Application Backend, Durable Request Store, and Notification Service** are inside the Internal Operations Service Hub.

The **Employee, Department Staff, Administrator, and Company Identity Provider** are outside the system boundary.

The Company Identity Provider is an external dependency because the product specification assumes that users have some form of company identity for accessing the internal system.

The exact notification delivery channel is still unknown. It may later be implemented using email, in-app notifications, or another approved mechanism.

---

## 5. Components and Responsibilities

### Web UI

The Web UI allows employees, department staff, and administrators to interact with the system.

Responsibilities:

* collect request information;
* display submitted requests;
* display permitted request details;
* display the responsible department and current status;
* allow department staff to perform permitted request actions;
* allow administrators to perform permitted administrative actions;
* send user actions to the backend;
* display success or failure results.

### Application Backend

The backend contains the main application rules.

Responsibilities:

* validate required request information;
* determine whether a user is allowed to access or modify a request;
* create requests;
* ensure requests have a responsible department;
* retrieve permitted requests and request details;
* update request status;
* mark requests as resolved;
* perform authorized administrative operations;
* trigger notifications for important request events;
* save successful changes.

### Durable Request Store

The Durable Request Store keeps the information needed by the system, including:

* the request;
* its requester;
* its responsible department;
* its current status;
* department information;
* user roles or access permissions required by the system.

This section defines the information that must be stored without defining database tables or a specific storage technology.

### Notification Service

The Notification Service handles notifications triggered by important request events.

Responsibilities:

* receive notification requests from the backend;
* identify the intended recipient;
* send notifications using the configured notification channel;
* keep notification delivery separate from the main request operation.

Examples include:

* notifying the responsible department when a new request requires attention;
* notifying the requester when the request status changes;
* notifying the requester when the request is resolved.

The exact notification delivery channel is still to be determined.

### Company Identity Provider

The Company Identity Provider confirms the identity of company users before they access protected parts of the system.

---

## 6. Important Data Flows

### Submit a Request

```text
Employee
   ↓
Web UI
   ↓
Application Backend
   ↓
Validate request
   ↓
Associate responsible department
   ↓
Durable Request Store
   ↓
Request saved
   ├──────────────>Success response to employee
   |
   └──────────────> Notification Service
                          ↓
                 Notify responsible department
```

This flow supports **FR-01, FR-02, FR-09, AC-01, AC-06, and AC-07**.

A request is not treated as successfully submitted if required information is missing or if the request cannot be stored.

The request must be stored successfully before the department notification is triggered.

### View Submitted Requests

```text
Employee
   ↓
Web UI
   ↓
Application Backend
   ↓
Check access
   ↓
Durable Request Store
   ↓
Return permitted requests and details
```

This supports **FR-03, FR-04, FR-06, AC-02, and AC-05**.

The backend only returns information that the user is authorized to access.

### Department Staff Handles a Request

```text
Department Staff
      ↓
Web UI
      ↓
Application Backend
      ↓
Check department authorization
      ↓
View or update request
      ↓
Durable Request Store
      ↓
Change saved
      ├──────────────→ Success response
      |
      └──────────────→ Notification Service
                              ↓
                       Notify requester
```

This supports **FR-05, FR-06, FR-07, FR-08, FR-10, AC-03, AC-04, AC-05, and AC-08**.

A notification is triggered after an important request change has been successfully saved.

### Administrator Manages System Configuration

```text
Administrator
      ↓
Web UI
      ↓
Application Backend
      ↓
Check administrator authorization
      ↓
Update department or access permission
      ↓
Durable Request Store
      ↓
Change saved
```

This supports **FR-11 and AC-09**.

Administrative operations require administrator authorization and cannot be performed by a normal employee unless that user has the required administrative permissions.

---

## 7. Trust and Authorization

The system must not rely only on the Web UI to decide whether a user is allowed to perform an action.

The backend checks the user's identity and permissions before allowing access to protected request information or administrative operations.

```text
User request
     ↓
Authentication
     ↓
Authorization
     ↓
Permitted operation
```

Authentication determines **who the user is**.

Authorization determines **what the user is allowed to view or change**.

Examples:

* an employee may access requests they are permitted to see;
* department staff may manage requests assigned to their department when authorized;
* administrative operations require administrator-level authorization.

Notifications must also be directed only to intended authorized recipients.

This supports the **Security NFR, Notification Security NFR, and AC-05**.

---

## 8. Communication Decisions

Core user actions use synchronous request/response communication between the Web UI and Application Backend.

This is appropriate because users need an immediate response when they:

* submit a request;
* access a request;
* update a request's status;
* mark a request as resolved;
* perform an administrative action.

Notifications are handled separately from the main request operation.

Notification delivery may use asynchronous communication after the main operation has completed successfully.

For example:

```text
Status update
     ↓
Save change
     ↓
Return success
     ↓
Send notification separately
```

This prevents notification delivery from unnecessarily delaying the user's main operation.

---

## 9. External Dependency

The main external dependency currently identified by the architecture is the **Company Identity Provider**.

The Company Identity Provider is used to confirm company user identity.

If the user's identity cannot be confirmed, the system must not allow protected access.

The exact notification delivery channel has not yet been selected. Therefore, no external email or notification provider is assumed at this stage.

If a future decision requires an external notification provider, that provider will become an additional external dependency.

---

## 10. Failure Behavior

### Request or Status Change Cannot Be Stored

If a request or status change cannot be stored successfully, the system must not report the operation as successful.

This follows from the Reliability / Data Integrity NFR.

### Missing Required Information

If required information is missing, the backend rejects the submission.

This follows from AC-06.

### Unauthorized Access

If a user is not authorized to access or modify a request, the backend prevents the operation.

This follows from AC-05 and the Security NFR.

### Authentication Failure

If the system cannot verify the user's company identity, protected access is denied.

### Unauthorized Administrative Action

If a user attempts to perform an administrative action without the required administrator permission, the backend prevents the operation.

### Notification Delivery Failure

If a notification cannot be delivered, the successfully saved request or status change must remain saved.

A notification failure must not cause an otherwise successful request submission or status update to be treated as failed.

The notification failure should be recorded so that it can be retried or investigated without losing the underlying request change.

You should now be able to select the writing block and copy the entire document much more easily.
