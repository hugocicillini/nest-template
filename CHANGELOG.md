# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

Entries below `## [Unreleased]` are generated automatically by
`npm run release` (via [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version))
from [Conventional Commits](https://www.conventionalcommits.org/) messages -
see [Contributing](README.md#contributing) in the README.

## [Unreleased]

### Added

- JWT authentication with refresh-token rotation, capped at 5 concurrent
  sessions per user (oldest evicted, never rejected)
- Per-account lockout (5 failed logins / 15 min) alongside per-IP rate
  limiting, cleared automatically on a successful password reset
- Password reset and email verification flows (single-use tokens), with
  expired/used tokens pruned automatically by scheduled jobs
- Role-based access control with fine-grained permission strings
  (`users:read`, `roles:write`, etc.), not just a coarse admin/non-admin split
- File uploads validated by magic-byte sniffing, path-traversal-safe storage
  keys, ownership-scoped access, streamed downloads, and physical deletion on
  remove
- Redis-backed cache-aside pattern with explicit invalidation on writes
- Async email/notification delivery via BullMQ, with retry/backoff and
  Sentry failure reporting once retries are exhausted
- Structured, non-blocking audit log for sensitive actions
- Full observability via Sentry (errors, tracing, profiling, structured
  logs) and correlation via a `requestId` echoed as `X-Request-Id`
- Clean Architecture layering enforced at build time by `dependency-cruiser`
- API versioning (`/v1`) and machine-readable error codes on every response
- Liveness (`/health/live`) and readiness (`/health`) endpoints
- Multi-stage Docker build, `docker-compose` for local Postgres/Redis,
  GitHub Actions CI, CodeQL security scanning, Dependabot
- Husky + commitlint enforcing Conventional Commits
- Representative unit test suite plus e2e coverage for the auth flows,
  account lockout, and request validation
- WebSocket push for notifications (Socket.io, Redis adapter for
  multi-instance broadcast), authenticated with the same JWT used over HTTP
- Password breach checking against Have I Been Pwned via k-anonymity (only a
  hash prefix ever leaves the process) on registration and password reset
- Session management (list/revoke active refresh tokens) and self-service
  account deletion
- Swappable optional adapters for file storage (S3) and outbound email
  (Resend) behind the same ports as the local/log-based defaults

### Changed

- **Breaking:** split the Redis connection in two - `REDIS_URL` now backs
  only BullMQ, while the cache/rate-limit/lockout adapter requires its own
  `CACHE_REDIS_URL`. A queue backlog can no longer compete with the
  login-lockout counter for the same Redis's CPU/memory, and either side can
  move to Redis Cluster Mode independently later (the cluster protocol only
  exposes db 0, which ruled out sharing one Redis via logical databases).
  Existing deployments must set `CACHE_REDIS_URL` before upgrading.

### Fixed

- Wrapped the multi-write command handlers (register, verify email, reset
  password, delete user) in real database transactions, so a failure partway
  through can no longer leave a user record and its related token/session
  state inconsistent
- Replaced the login-lockout failure counter's read-then-write with an
  atomic Redis `INCR`, closing a race that let concurrent failed attempts
  lose increments
