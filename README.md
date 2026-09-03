# Internal Operations Service Hub

A company-internal system for employees to request and track help from departments such as IT, HR, and Finance.

The system is designed to give employees a clear way to submit internal requests, follow their current status, and see which department is responsible for handling them.

## Product Foundation

This repository contains the first version of the product foundation for the Internal Operations Service Hub.

It includes:

- the product specification and acceptance criteria;
- the proposed system architecture;
- the core data model and relationships;
- an architectural decision record for preserving request status history.

## Documentation

- [Product Specification](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Data Model](docs/data-model.md)
- [ADR-001: Preserve Request Status History](docs/decisions/ADR-001.md)

## Core Actors

The system supports three main types of users:

- Employees / Requesters
- Service Department Staff
- Administrators

## Current Scope

The current version focuses on the product foundation rather than a complete application.

The defined scope includes request submission, department association, request tracking, status updates, authorization, notifications, and administrative access management.

A complete frontend, backend, CI/CD pipeline, and production infrastructure are not included at this stage.

## Repository Structure

```text
operations-hub/
├── README.md
└── docs/
    ├── product-spec.md
    ├── architecture.md
    ├── data-model.md
    └── decisions/
        └── ADR-001.md