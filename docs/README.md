# Documentation Index

This directory separates the current product documentation from historical
delivery evidence.

## Current product documentation

| Document | Purpose |
| --- | --- |
| [Product specification](product-spec.md) | Business problem, actors, requirements, acceptance criteria, and scope |
| [Architecture](architecture.md) | Delivered system boundaries, components, data flows, trust boundaries, and failure behavior |
| [Data model](data-model.md) | Persisted entities, relationships, invariants, indexes, and lifecycle |
| [Backend API guide](backend-api-guide.md) | API access rules, endpoints, and request lifecycle |
| [ADR-001](decisions/ADR-001.md) | Decision to store both current request status and status history |

## Delivery history

These files retain the evidence produced during the academy's incremental delivery
without making the root README look like a single-week submission.

| Document | Purpose |
| --- | --- |
| [Week 3 full-stack delivery](delivery/week3-full-stack-delivery.md) | Original authenticated request workflow and full-stack test evidence |
| [Week 4 AI-assisted delivery](delivery/week4-ai-assisted-requests.md) | AI boundary, structured output, safety, persistence, evaluation, and rollout design |

## Source-of-truth order

When documents differ, use this order:

1. Current implementation and Prisma schema
2. Current architecture and data-model documents
3. Product specification
4. Historical delivery documents

The delivery files describe how the project evolved and may intentionally mention
earlier boundaries that the current application has since extended.
