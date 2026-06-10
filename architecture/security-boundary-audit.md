# Service-Boundary Authorization Audit

**Audit date:** 2026-06-10 · **Scope:** all MVP services + the gateway · **Result: PASS**

This audit verifies the `security-model.md` rule: *"Authorization must be
explicit at service boundaries. Do not rely on mobile clients or gateway-only
checks."* Every service must authenticate and authorize each request itself.

## Method

For each service we checked three things from the code:

1. **Independent authentication** — does the service verify the JWT's signature
   and expiry itself (not trust the gateway)?
2. **Ownership scoping** — are user-scoped resources filtered by the
   authenticated `user_id`, never a caller-supplied id?
3. **Resource gates** — for shared resources (tribes), is access gated by
   membership / role?

## Result by service

| Service | Independent JWT verify | User-scoped reads/writes | Resource gate |
|---|---|---|---|
| `strem-auth-service` | ✅ `decode_access_token` (sig+exp+claims) | n/a (owns identity) | — |
| `strem-user-service` | ✅ | ✅ all XP/profile/medal reads filter `current.user_id` | — |
| `strem-training-service` | ✅ | ✅ sessions scoped to `current.user_id` | — |
| `strem-nutrition-service` | ✅ | ✅ days scoped to `current.user_id` | — |
| `strem-community-service` | ✅ | ✅ | ✅ `require_active_member` (403) + admin check (403) |
| `strem-ai-orchestrator` | ✅ | ✅ missions/recaps scoped to `current.user_id` | — |
| `strem-api-gateway` | forwards the token; owns no data | n/a | rate limit + size cap (HARDEN-01) |

### Evidence

- **Authentication.** Each service's `app/deps.py` calls
  `decode_access_token(...)` which runs `jwt.decode(token, secret,
  algorithms=[algorithm])` (verifies signature and `exp`) and rejects tokens
  missing required claims, raising `401 unauthorized`. The gateway does *not*
  decode the token — it forwards it, and each service re-verifies.
- **Ownership.** No endpoint accepts a `user_id` from the path or query for
  another user; user-scoped queries use the `current.user_id` derived from the
  verified token. A scan for caller-supplied user ids found none.
- **Tribe access.** `strem-community-service` gates every tribe-scoped route
  (check-ins, challenges, Tribe Power) through `require_active_member` (→ `403`),
  and admin-only actions through an additional admin check (→ `403`).
- **Secrets.** `JWT_SECRET` and DB URLs are env-backed (`pydantic-settings`,
  `env_file=".env"`); the only default is the obvious local placeholder
  `change-me-in-local-only`. No real secrets are committed (code scan clean).

## Findings

No cross-user access, gateway-trust, or committed-secret issues were found. The
boundary model is sound for MVP.

## Recommendations (hardening, non-blocking)

1. **Reject the placeholder secret outside local.** Fail startup if
   `JWT_SECRET == "change-me-in-local-only"` when an `ENV`/`STREM_ENV` is not
   `local`/`test`, so a real deployment can never run on the sample key.
2. **Secret rotation readiness.** Support a small set of accepted verification
   keys (current + previous) so `JWT_SECRET` can be rotated without a flag day.
   Tokens are short-lived (15 min access), which already bounds exposure.
3. **Keep this audit current.** Re-run it on any auth/authorization change
   (a `security-model.md` review gate) using the checklist below.

## Reusable checklist for a new (or changed) endpoint

- [ ] Requires a valid access token (depends on the service's `CurrentUser`).
- [ ] Reads/writes are filtered by the authenticated `user_id` — never a
      caller-supplied id.
- [ ] Shared-resource access is gated by membership/role (e.g. tribe), returning
      `403` (not `404`-as-`200`) on denial.
- [ ] Returns the contract `Error` shape with an accurate `code` for `401`/`403`.
- [ ] No secret values in code, logs, or tests; new secrets are env-backed and
      documented (name + purpose only) in the service `.env.example`.
- [ ] If the change touches authentication or authorization, a security review is
      required (`security-model.md` review gates).
