# ADR 0007: Private mission courses and coordinated deletion

## Status and scope

Approved implementation scope, 2026-10-22. The founder replied “go on” to the
explicit proposal for private mission-linked GPX storage in training-service,
additive migrations, authenticated upload/read/replace/export/delete, matching
API/mobile contracts and coordinated cleanup. This does not approve broader draft
contract PR #39, coaching changes, photo rights, a paid map provider or deployment.

Tracked by docs #24, training #10, contracts #38, gateway #11 and mobile #105.
Affected repositories: docs, shared-contracts, user-service, training-service,
api-gateway and mobile; the existing mission foundation is a prerequisite.

## Ownership and limits

Training owns one current private course per mission: original GPX bytes, geometry,
geometric analysis, source reference, version and save time. ZIP packaging is
discarded. Replacing overwrites the old file/model; no historical originals are
retained. Upload/source URL cannot grant verified official status. URLs are never
fetched. User-service remains the mission owner; training checks ownership through
its API with the athlete JWT, never through another service's database.

An authenticated course-only DELETE removes original bytes and model without
deleting the mission. Only owner/mission UUIDs and a monotonic version fence remain
until mission data deletion. Reattachment uses expected version 0 but receives a
new version, preventing stale removal/replacement from affecting a new attachment.

Archived missions retain readable courses but reject new attachments. An upload
authorized before archival may finish; deletion has the stronger fence below.
PUT uses quoted If-Match 0 for first attachment or the current course version.
Identical file/source retries return the existing result. Processing is synchronous
and bounded; async status/background jobs remain outstanding in training #10.

Limits: 4 MiB GPX/ZIP, 6 MiB JSON envelope, 20 MiB original GPX per owner, two
concurrent upload read/processing slots per service process, plus parser/analysis
limits. No worker, bucket or new infrastructure is introduced.

## Export and deletion protocol

First course authorization durably registers an owner generation in user-service
under its existing PostgreSQL per-owner transaction lock, preventing a first upload
from racing an unregistered deletion. Mission export includes all current courses
and original GPX bytes as base64. Training failure fails export, never silently
omits courses. A private course-only export is also available.

1. User-service commits an intent and advances the owner generation; mission writes
   and course authorizations pause while deletion is pending.
2. It calls training's internal purge with a short-lived JWT: audience
   `strem-course-cleanup`, purpose `purge_race_courses`, owner UUID subject,
   generation and expiry. Athlete access tokens cannot call it; the gateway does
   not route the internal operation.
3. Training serializes writes and purge with its own PostgreSQL per-owner lock.
   Purge atomically advances the generation fence and erases original/normalized
   course content. Older in-flight uploads fail. Equal-generation purge retries
   are no-ops, protecting courses created after a completed deletion.
4. User-service confirms the matching intent, erases missions/revisions/receipts,
   and completes it. A late concurrent finalizer cannot erase newer missions.

Failure/disconnect/restart retains the pending intent. Retry DELETE to finish;
never report 204 early. Only owner UUID/counter/pending state remain as fencing
metadata, without mission/course content. Account-wide erasure and backup retention
are separate controls; these fences are not an activity history.

## Migration and rollout

Apply additive training `0005_mission_courses` and user `0009_course_cleanup` before
new code. No existing records change. User `COURSE_STORAGE_BASE_URL` is the internal
training ROOT, e.g. `http://localhost:8003`; training's user-service URL includes
`/v1`. Empty configuration disables first attachment but must never skip cleanup
once an account has course state. Keep additive tables on application rollback.
Do not restore old mission-deletion code after course use without disabling that
old deletion surface: it cannot coordinate erasure. Destructive downgrade requires
a separate retention/backup decision; an explicit flag is used only in the
disposable user migration test. No deployment settings are changed here.

## Presentation and verification

Race Lab draws actual uploaded geometry without a licensed basemap, labelled as
such. Section selection synchronizes route/profile highlights and text. Missing
elevation and gaps stay unknown; calculated totals never overwrite event facts.
File-picker cache copies are discarded after the attempt. No race assets ship.

Tests cover private ownership, replacement/retry/conflicts, erasure failure/retry,
late uploads and stale cleanup. Disposable PostgreSQL verifies migration, reconnect
persistence and locking. Real-service browser tests use synthetic accounts/GPX.
Native file handling, accessibility/athlete acceptance, basemap selection, event
photo rights and production rollout remain separate acceptance work.
