# Security review

Review date: 2026-11-01
Scope: full repository, server, client, Docker, CI, and dependency manifests.

## Result

No unresolved high-confidence exploitable issue was found in the reviewed
implementation. Phase 7 added production configuration guards, conditional API
documentation, container header policy, CI audits/secret scanning, and commit
hooks. Validation commands and their results are recorded below.

## Checklist

| Area                  | Verification                                                                                                                   | Result      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| Client privacy        | Appointment schemas and UI use `clientCode`; no client names, phones, emails, or clinical fields are accepted for appointments | Pass        |
| Notes separation      | `PrivateNote` is separate, AES-256-GCM encrypted with AAD, owner-scoped, no-store, absent from list/stats responses            | Pass        |
| Notes client handling | Notes query is enabled only when the counsellor opens the drawer; no persistence; lock/logout removes state and cache          | Pass        |
| Authentication        | bcrypt cost 12, auth rate limit, refresh rotation/reuse detection, httpOnly SameSite=Strict cookie, access token in memory     | Pass        |
| Deactivated users     | Authentication rejects inactive users on each authenticated request                                                            | Pass        |
| Authorization         | Route and ownership table below; counsellor queries are scoped to their own ID                                                 | Pass        |
| Input handling        | Strict Zod schemas, body limit, Mongo sanitization, HPP, bounded regexes, no mass assignment in services                       | Pass        |
| Transport             | Helmet, CORS allowlist, HSTS in production, Nginx CSP and browser security headers, global/auth/note limits                    | Pass        |
| Concurrency           | Booking lock increments counsellor booking version inside a transaction before conflict check                                  | Pass        |
| Dependencies          | `npm audit --omit=dev --audit-level=high` is run in CI for both packages                                                       | CI enforced |

## Authorization matrix

| Route                                 | Method         | Roles          | Ownership rule                                                         |
| ------------------------------------- | -------------- | -------------- | ---------------------------------------------------------------------- |
| `/healthz`                            | GET            | Public         | None                                                                   |
| `/readyz`                             | GET            | Public         | None                                                                   |
| `/api/v1/auth/login`                  | POST           | Public         | Rate limited                                                           |
| `/api/v1/auth/refresh`                | POST           | Refresh cookie | Rotation and reuse detection                                           |
| `/api/v1/auth/logout`                 | POST           | Refresh cookie | Revokes presented token                                                |
| `/api/v1/auth/me`                     | GET            | Authenticated  | Current user only                                                      |
| `/api/v1/auth/register`               | POST           | Admin          | Creates counsellor only                                                |
| `/api/v1/appointments`                | GET            | Authenticated  | Counsellors see own appointments; admins may filter                    |
| `/api/v1/appointments`                | POST           | Authenticated  | Counsellors are assigned to self; admins must choose active counsellor |
| `/api/v1/appointments/:id`            | GET            | Authenticated  | Counsellors are scoped to own appointment; admins may read all         |
| `/api/v1/appointments/:id`            | PATCH/DELETE   | Authenticated  | Same ownership scope; state machine applies                            |
| `/api/v1/appointments/:id/attendance` | PATCH          | Authenticated  | Same ownership scope; scheduled and started only                       |
| `/api/v1/appointments/:id/note`       | GET/PUT/DELETE | Counsellor     | Exact owning counsellor; admins receive 404                            |
| `/api/v1/availability`                | GET            | Authenticated  | Active counsellor availability                                         |
| `/api/v1/stats`                       | GET            | Authenticated  | Counsellors are forced to self; admins may filter                      |
| `/api/v1/users`                       | GET            | Admin          | Admin-only                                                             |
| `/api/v1/users/:id/deactivate`        | PATCH          | Admin          | Admin-only; self-deactivation rejected                                 |

## Production controls

Production configuration refuses `.env.example` placeholder secrets, requires
`TRUST_PROXY=true`, and requires an HTTPS `CORS_ORIGIN`. Secure refresh cookies
and HSTS are enabled in production. `/api/docs` is not registered in production;
the test suite verifies the hidden route behavior.

The Nginx policy uses a same-origin `/api/` proxy, SPA fallback, no-store
`index.html`, immutable hashed assets, CSP without `unsafe-inline` scripts,
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy:
no-referrer`, and a restrictive `Permissions-Policy`.

## Dependency and secret controls

- CI runs npm audit at high severity for production dependencies in both packages.
  The current audit reports transitive findings: server `tar`/`minimatch`
  vulnerabilities remain behind development/build tooling and the client has a
  moderate React Router advisory whose forced fix is a breaking major upgrade.
  No non-breaking fix was applied automatically; these are tracked residual
  dependency risks rather than silently ignored.
- CI runs Gitleaks on every push and pull request.
- Husky/lint-staged runs ESLint and Prettier on staged files.
- The pre-commit hook blocks staged `.env` files.
- Docker ignore files exclude dependencies, build output, coverage, env files,
  and cookie artifacts.
- The refresh-token race was fixed by atomically claiming a token with
  `findOneAndUpdate({ tokenHash, revokedAt: null })`. Concurrent claims now
  produce one replacement and revoke the whole family for reuse attempts.
- `bcrypt` was replaced with `bcryptjs`, which retains compatibility with
  existing bcrypt hashes and cost 12 while removing the native
  `node-pre-gyp`/`tar` dependency chain. React Router was upgraded to the
  patched 7.18.5 release.
- Production dependency audits now report no vulnerabilities in either
  package.

## Known limitations and residual risks

- Encryption keys are supplied through environment variables rather than a KMS.
- MFA is not implemented.
- The JSON-only API relies on SameSite=Strict cookies and does not use a CSRF token.
- The deployment topology is single-region and Mongo is a single-node replica set;
  it provides transactions, not high availability.
- API documentation is intentionally unavailable in production.
- Operational secret rotation, backups, and incident response remain deployment
  responsibilities.

## Verification commands

```text
server: npm run lint
server: npm test
client: npm run lint
client: npm test
client: npm run build
server/client: npm audit --omit=dev --audit-level=high
docker: docker compose config
```
