"""Run Alembic migrations for every database-backed MVP service.

The API containers intentionally start without mutating schemas. This local
helper applies migrations inside those containers after `docker compose up`.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

DEFAULT_SERVICES = ("auth", "user", "training", "nutrition", "community", "ai")
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COMPOSE_FILE = ROOT / "docker" / "docker-compose.yml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--compose-file",
        default=str(DEFAULT_COMPOSE_FILE),
        help="Path to the Docker Compose file.",
    )
    parser.add_argument(
        "--service",
        action="append",
        choices=DEFAULT_SERVICES,
        help="Run only this service. Repeat for multiple services.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    compose_file = str(Path(args.compose_file).resolve())
    services: tuple[str, ...] = tuple(args.service or DEFAULT_SERVICES)

    for service in services:
        cmd = [
            "docker",
            "compose",
            "-f",
            compose_file,
            "exec",
            "-T",
            service,
            "alembic",
            "upgrade",
            "head",
        ]
        print(f"==> Migrating {service}")
        result = subprocess.run(cmd, check=False)
        if result.returncode != 0:
            return result.returncode

    print("All MVP service migrations are at head.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
