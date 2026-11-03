"""Delete one account and everything it owns from the LOCAL Docker stack.

For testing the first-run flow from zero (strem-mobile#129): remove an account,
then register again with the same email and walk through onboarding fresh.

Local development only. It talks to the `postgres` service of this repo's
Docker Compose stack and refuses anything else; it never touches a deployed
database. Rows are matched by the account's user id in every service database
(auth, user, training and AI). Nothing is printed except table names and row counts.

    python scripts/delete-local-account.py --email someone@example.com
    python scripts/delete-local-account.py --email someone@example.com --yes
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPOSE = ["docker", "compose", "--env-file", str(ROOT / ".env"), "-f", str(ROOT / "docker" / "docker-compose.yml")]
DATABASES = ("strem_auth", "strem_user", "strem_training", "strem_ai")
# Tables keyed by the user id itself rather than a user_id column.
ID_TABLES = {"strem_auth": ("users",), "strem_user": ("user_profiles",)}
UUID = re.compile(r"^[0-9a-f-]{36}$")


def psql(database: str, sql: str, user: str) -> tuple[int, str]:
    run = subprocess.run(
        [*COMPOSE, "exec", "-T", "postgres", "psql", "-U", user, "-d", database, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
    )
    return run.returncode, (run.stdout if run.returncode == 0 else run.stderr).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    parser.add_argument("--yes", action="store_true", help="Delete without asking.")
    parser.add_argument("--db-user", default="strem")
    args = parser.parse_args()

    email = args.email.strip().lower().replace("'", "")
    code, out = psql("strem_auth", f"select id from users where lower(email) = '{email}'", args.db_user)
    if code != 0:
        print(f"Could not reach the local stack's postgres: {out}", file=sys.stderr)
        return 1
    if not out:
        print("No local account with that email; you can register it right away.")
        return 0
    user_id = out.splitlines()[0]
    if not UUID.match(user_id):
        print("Unexpected user id format; stopping.", file=sys.stderr)
        return 1
    if not args.yes and input(f"Delete the local account {email} and all its data? [y/N] ").strip().lower() != "y":
        print("Nothing deleted.")
        return 0

    for database in DATABASES:
        code, tables = psql(
            database,
            "select table_name from information_schema.columns where table_schema = 'public' "
            "and column_name = 'user_id' order by table_name",
            args.db_user,
        )
        if code != 0:
            continue  # database not present in this stack
        pending = [(t, "user_id") for t in tables.splitlines() if t] + [(t, "id") for t in ID_TABLES.get(database, ())]
        # Foreign keys between user-owned tables: retry until every table is done.
        for _ in range(len(pending) + 1):
            failed = []
            for table, column in pending:
                code, out = psql(database, f"with gone as (delete from \"{table}\" where {column} = '{user_id}' returning 1) select count(*) from gone", args.db_user)
                if code != 0:
                    failed.append((table, column))
                elif out != "0":
                    print(f"  {database}.{table}: {out}")
            if not failed or len(failed) == len(pending):
                pending = failed
                break
            pending = failed
        if pending:
            print(f"  {database}: could not clear {', '.join(t for t, _ in pending)}", file=sys.stderr)
            return 1
    print(f"Deleted. Register {email} again to start from zero.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
