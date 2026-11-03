-- Create one database per MVP service in the shared local Postgres instance.
-- Data ownership rule: each service owns its own database and no service reads
-- or writes another's directly.
-- This runs once, on first container boot, via /docker-entrypoint-initdb.d.

CREATE DATABASE strem_auth;
CREATE DATABASE strem_user;
CREATE DATABASE strem_training;
CREATE DATABASE strem_ai;
