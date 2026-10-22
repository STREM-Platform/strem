# strem-training-service

Strength, running, and mobility **session logging** for STREM. Implements
`strem-shared-contracts/contracts/training/openapi.yml` and publishes
`training.session_logged` so `strem-user-service` can award XP.

Running stays in this service for MVP — there is no separate endurance service
(see `strem-docs/architecture/service-map.md`). This service does **not** own XP,
ranks, or medals.

## Endpoints

All routes are served under the `/v1` base path (the health probe is unversioned).
Every `/v1` route is authenticated with the access token from `strem-auth-service`
and scoped to the token's `user_id`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Liveness probe → `{"status":"ok","service":"strem-training-service"}`. |
| `POST` | `/v1/training/sessions` | Log a strength / running / mobility session; publishes `training.session_logged`. |
| `GET`  | `/v1/training/sessions` | List the caller's sessions (paginated, newest first; optional `session_type` filter). |
| `GET`  | `/v1/training/sessions/{session_id}` | Get one of the caller's sessions by id. |

## Course processing (training #10, internal increment)

`app/course_processing.py` processes a local GPX 1.0/1.1 file or a ZIP containing
exactly one GPX. It returns immutable segments, coordinates, cumulative horizontal
distance and raw elevation totals. This increment has no upload endpoint,
database storage or mobile connection yet.

```bash
python -m app.course_processing /path/to/course.gpx
python -m app.course_processing /path/to/course.zip
python -m app.course_processing /path/to/course.zip --analyze
```

The command prints a summary without coordinates or file metadata. The supplied
GPX bytes have a SHA-256 fingerprint; ZIP packaging does not change that identity.
Both input and total archive expansion are capped at 4 MiB, with at most 16 ZIP
entries, 50,000 course points, 250,000 XML elements and 32 nesting levels. Parsing
disables DTDs, entities and external resolution. Archives are read in memory;
unsafe paths, symlinks, encryption, nested ZIPs and multiple GPX files are rejected.

Only one direct track or route in its matching official namespace is accepted.
Waypoints and extension geometry do not become course points. Track segment breaks
never add distance or elevation between segments. Calculation version
`gpx-haversine-raw-elevation-v1` uses a sphere of radius 6,371,008.8 m and retains
full precision internally. Edges longer than 500 m receive a sparse-geometry warning.
Elevation is unsmoothed: GPS noise can inflate ascent/descent. Any missing elevation
makes totals and extrema unknown. Coordinates must be finite GPX latitude/longitude;
elevation must be finite and within +/-100,000 m as a parser sanity bound.

These are calculations from a supplied file, not organizer-verified race facts.
No terrain, aid stations, cutoffs, race edition or photo rights are inferred.
Private storage, export/deletion across services and the public upload contract
remain the reviewed next increment under training #10 / docs #24.

Local reference verification on 2026-10-22 used the organizer-linked
[UTH50 ZIP](https://upthehill.run/strecken/uth50/): 1,515 points in one segment,
50,154.25 m calculated horizontal distance and 2,214.63 m raw ascent. This differs
from the published 50.0 km / 2,100 m; raw totals must not overwrite organizer facts.
GPX SHA-256: `d9d7cc9f2a2038680c25f3714fe306ca6fbae1f4f19a3f9c13dd795b1dccda2b`.
The race file is not a committed test fixture or an approved distribution asset.

`app/course_analysis.py` adds internal geometric course sections and grade/run
summaries (`--analyze`). Method `course-100m-net-grade-v1` splits each track segment
into 100 m sections plus its final partial section. Elevation change is distributed
linearly within recorded edges up to 500 m; missing elevations and longer edges
make affected sections unknown. Zero-distance elevation jumps are warned and make
the following affected section unknown; a terminal jump adds no horizontal section.
Track gaps are never bridged. At most 10,000 sections are allocated; larger output
is rejected before section construction.

Grade is net elevation change / horizontal distance, not maximum local slope.
Distance-weighted bands are `<-10%`, `[-10,-3)%`, `[-3,3)%`, `[3,10)%`, `>=10%`;
unknown distance is reported separately. Candidate ascent/descent runs require
consecutive sections with at least 3% grade in the same direction, at least 300 m
distance and 30 m net elevation change. Unknown, rolling, opposite-direction and
segment boundaries end a run. These conservative geometric runs may split a named
climb at a brief flatter stretch. This is an explicit algorithm choice, not an
organizer climb list, technicality classification, physiological demand estimate
or pacing recommendation. Raw elevation noise can still affect these results.
Sections/runs retain distances and segment indexes for a future synchronized
map/profile inspector; no frontend is connected yet.

## Run locally

Bring up Postgres + Redis via `strem-infra` (`docker compose up`), then:

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env

alembic upgrade head            # create the schema
uvicorn app.main:app --reload   # http://localhost:8003/health
```

## Run with Docker

```bash
docker build -t strem-training-service .
docker run -p 8003:8000 --env-file .env strem-training-service
```

## Checks (what CI runs)

```bash
ruff check .      # lint
mypy .            # type check (strict)
pytest            # endpoint tests over httpx + in-memory SQLite
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Async PostgreSQL connection string for the training database. |
| `JWT_SECRET` | Shared secret used to verify access tokens from strem-auth-service. |
| `JWT_ALGORITHM` | JWT algorithm (default `HS256`); must match strem-auth-service. |
| `MESSAGE_BROKER_URL` | Redis Streams broker for publishing `training.session_logged`. |
