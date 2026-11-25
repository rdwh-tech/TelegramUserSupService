# API and event contracts

This directory is the machine-readable contract boundary for the support API. The four OpenAPI 3.0.3 documents are validated by `go test ./contracts`. HTTP business operations described here are target contracts for API-02–API-08; API-01 only implements bootstrap, health, and readiness behavior.

## Documents

- `bot.openapi.yaml` — the 12 service-token-protected bot operations under `/internal/bot/v1`.
- `session.openapi.yaml` — the internal analytics session check under `/internal/auth/v1/session`.
- `web.openapi.yaml` — the camelCase public panel API under `/api`, including separate refresh-token exchange.
- `events.openapi.yaml` — recipient-specific RabbitMQ payload schemas for eight bot events, eight analytics events, and two SLA events consumed by the API.
- `testdata/` — complete examples with real UUID syntax; each example is validated against its recipient schema.

Internal HTTP and RabbitMQ fields use snake_case. Public panel DTOs preserve the existing camelCase client shapes. All HTTP errors use `{ "error": { "code", "message", "details", "request_id" } }`.

## Accepted design clarifications

- An administrator may read ticket conversations and protected attachments in their company. Analytics still receives metadata only.
- Analytics owns creation and updates of `ticket_sla_metrics`; the API reads results and consumes notifications.
- L2 FRT and TTR start at `escalated_at`; escalation leaves the ticket `in_progress`, changes the line to L2, and removes the assignee.
- Reopening returns a ticket to `new/l1`, clears the assignee, and begins a new SLA cycle while preserving prior-cycle history.
- A valid user without a company receives `403 ACCESS_DENIED` from the internal session endpoint.
- Registration returns access and refresh tokens plus a user whose `companyId` is initially `null`; refresh uses the separate `/api/auth/refresh` operation.

## Integration notes for bot and analytics teams

- SLA result timestamps use `calculated_at`.
- Reopened tickets require cycle-aware history and aggregation; prior breaches are retained.
- Consumers must handle late and out-of-order events. A late `ticket.created` fills missing snapshot state and a late message triggers recalculation of the affected cycle.
- Events are at-least-once. `event_id` is the idempotency identity, `schema_version` is currently exactly `1`, and unknown optional fields are accepted.
- The bot receives only protected `download_path` values for operator attachments. Events never contain service tokens or storage URLs.
