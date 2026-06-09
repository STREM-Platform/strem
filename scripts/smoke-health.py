"""Smoke-check every HTTP health endpoint in the local MVP stack."""

from __future__ import annotations

import sys
import urllib.error
import urllib.request

SERVICES = (
    ("gateway", 8000),
    ("auth", 8001),
    ("user", 8002),
    ("training", 8003),
    ("nutrition", 8004),
    ("community", 8005),
    ("ai", 8006),
)


def main() -> int:
    failed = False
    for name, port in SERVICES:
        url = f"http://localhost:{port}/health"
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    print(f"ok    {name} (:{port})")
                    continue
        except (OSError, urllib.error.URLError):
            pass

        print(f"FAIL  {name} (:{port})")
        failed = True

    if failed:
        print("One or more services are unhealthy. Check 'docker compose ps' and logs.")
        return 1

    print("All services healthy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
