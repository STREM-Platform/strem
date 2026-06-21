# STREM Legal & Policy Framework

This directory holds STREM's user-facing legal documents and the versioning and
acceptance model that the product enforces. It is a **launch blocker** for public
release: STREM ships AI-assisted health guidance and stores training, nutrition,
recovery, and (soon) biomarker data, so users must be able to read these policies
and record that they accept them before that data is collected or that guidance is
given.

These documents are written to be legally substantive and on-brand (see
`vision/brand-identity.md`): direct, calm, precise, and honest. They are **not** a
substitute for review by qualified counsel in the jurisdictions STREM operates in.
Treat the wording here as the engineering source of truth that legal review
refines, not as final advice.

---

## The documents

| File | Document type | What it covers |
|---|---|---|
| [`terms-of-service.md`](terms-of-service.md) | `terms` | Acceptable use, account responsibilities, liability, termination. |
| [`privacy-policy.md`](privacy-policy.md) | `privacy` | What we collect (incl. wearable OAuth tokens, training/nutrition/recovery, biomarkers), how it is used, retention, third parties (Anthropic, Whoop, Strava), and user rights including export and deletion. |
| [`medical-disclaimer.md`](medical-disclaimer.md) | `medical` | STREM is not a medical device or a substitute for professional advice; coaching, readiness, and biomarker insights are estimates and may be wrong; consult a qualified professional. |

The `document type` values (`terms`, `privacy`, `medical`) are the canonical keys
used everywhere acceptance is recorded — in `strem-user-service`
(`app/legal.py`, the `legal_acceptances` table, and the `/users/me/legal`
endpoints) and in the mobile accept-gate UI.

---

## Versioning model

Each policy begins with a header block:

```
Version:      2026-06-20
Effective:    2026-06-20
Last-updated: 2026-06-20
```

- **`Version`** is the canonical version string and the single value that drives
  acceptance. It is a calendar date (`YYYY-MM-DD`). Using a date keeps versions
  human-readable, monotonic, and trivially comparable. Two materially different
  releases on the same day would append a suffix (`2026-06-20a`), but the common
  case is one version per day at most.
- **`Effective`** is the date the version takes legal effect for users.
- **`Last-updated`** is the date the file was last edited (may differ from
  `Version` for non-material typo fixes that do **not** require re-acceptance).

**A material change bumps `Version`.** A material change is anything that alters
what data we collect, how we use or share it, the user's rights, the limits of
liability, or the scope of the medical disclaimer. Typo and formatting fixes that
do not change meaning update only `Last-updated` and leave `Version` alone, so
users are not re-prompted for cosmetic edits.

When a `Version` changes, every user must accept the new version before continuing
to use the gated surface (see below). The previous acceptance is retained for
audit; a new `legal_acceptances` row is written for the new version.

---

## Acceptance model

Acceptance is recorded **per user, per document type, per version** and is
**append-only** (we never mutate or delete an acceptance row — re-accepting a new
version inserts a new row, preserving the history of what each user agreed to and
when).

The current required version for each document type lives in code, not in this
directory, so the backend can compare what a user has accepted against what is
required without parsing Markdown:

- **Source of truth for required versions:**
  `strem-user-service/app/legal.py` (`REQUIRED_VERSIONS`). The values there
  **must** match the `Version:` headers in these files. When you bump a header
  here, bump the constant there in the same change, and the contract response in
  `strem-shared-contracts/contracts/user/openapi.yml` if the shape changes.

- **Recording acceptance:** `POST /users/me/legal/accept` records one or more
  acceptances (`document_type` + `version`). The service rejects a version that
  does not match the current required version for that document, so a client
  cannot record acceptance of a stale or unknown version.

- **Checking acceptance:** `GET /users/me/legal` returns, for each document type,
  the current required version, the version the user has accepted (if any), and a
  top-level `needs_acceptance` boolean that is `true` when any required document is
  unaccepted or out of date.

### Where the gates fire (product requirement)

Per `product/next-steps-plan.md` §3.4, the accept gates surface:

1. at **onboarding** (explicit accept of Terms + Privacy + Medical Disclaimer),
2. **before the first biomarker entry** (re-confirm the Medical Disclaimer where
   the highest-signal health inference happens), and
3. in **Profile**, so a user can re-read the current policies and see what they
   accepted and when.

> **Scope note (this wave).** The backend (acceptance recording + versioned
> registry + `/users/me/legal` endpoints), these policy documents, and the OpenAPI
> contract are delivered now. The **mobile accept-gate UI and the in-app
> disclaimer surfacing are a deliberate deferred follow-up slice**
> (`strem-mobile#58`-mobile) — the mobile working tree is owned by another agent
> this wave. The backend is built so that follow-up only needs to call the two
> endpoints above and render these documents.

---

## How a policy change ships

1. Edit the relevant `*.md` file. If the change is **material**, bump `Version` and
   `Effective` (and `Last-updated`); otherwise bump only `Last-updated`.
2. If `Version` changed, update `REQUIRED_VERSIONS` in
   `strem-user-service/app/legal.py` to match, and run that service's test suite
   (the registry has a test asserting the versions are well-formed dates).
3. If the API response shape changed, update
   `strem-shared-contracts/contracts/user/openapi.yml` and validate contracts.
4. Update the mobile accept-gate copy/version handling in the `#58`-mobile
   follow-up slice.

Keeping the version string in exactly these four places aligned is the whole
contract: documents here, the registry constant, the OpenAPI schema, and the
mobile gate.
