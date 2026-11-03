"""Opt-in real HTTP/process restart test, using only the disposable PostgreSQL DB.

Run after test_race_mission_postgres.py. STREM_TEST_GATEWAY_REPO explicitly opts
into the cross-repository process test. Tokens are locally signed test tokens;
this does not claim to exercise auth-service registration or the mobile browser.
"""

import os
import socket
import subprocess
import sys
import time
import uuid
from pathlib import Path

import httpx
import pytest
from sqlalchemy.engine import make_url

from tests.support import TEST_SETTINGS
from tests.test_race_missions import PAYLOAD, headers


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_ready(base: str, process: subprocess.Popen[bytes]) -> None:
    deadline = time.monotonic() + 10
    with httpx.Client(timeout=0.5) as client:
        while time.monotonic() < deadline:
            assert process.poll() is None, "Test API exited during startup"
            try:
                if client.get(f"{base}/health").status_code == 200:
                    return
            except httpx.RequestError:
                pass
            time.sleep(0.05)
    raise AssertionError("Test API did not become healthy within 10 seconds")


def stop(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def test_gateway_real_http_restart_and_owner_isolation() -> None:
    target = os.environ.get("STREM_TEST_POSTGRES_URL")
    gateway_path = os.environ.get("STREM_TEST_GATEWAY_REPO")
    if not target or not gateway_path:
        pytest.skip("Requires disposable PostgreSQL and STREM_TEST_GATEWAY_REPO")
    url = make_url(target)
    assert url.drivername == "postgresql+asyncpg"
    assert url.host in {"localhost", "127.0.0.1", "::1"}
    assert url.database == "strem_mission_test"
    gateway_repo = Path(gateway_path).resolve()
    assert gateway_repo.name == "strem-api-gateway"
    assert (gateway_repo / "app" / "main.py").is_file()
    user_repo = Path(__file__).resolve().parents[1]
    user_port, gateway_port = free_port(), free_port()
    assert user_port != gateway_port
    user_base = f"http://127.0.0.1:{user_port}"
    gateway_base = f"http://127.0.0.1:{gateway_port}"
    # All credentials are disposable and unrelated to the developer's .env.
    env = {
        **os.environ,
        "DATABASE_URL": target,
        "JWT_SECRET": TEST_SETTINGS.jwt_secret,
        "JWT_ALGORITHM": "HS256",
        "REDIS_URL": "",
        "RATE_LIMIT_MAX": "500",
        "USER_BASE_URL": f"{user_base}/v1",
        "UPSTREAM_TIMEOUT_SECONDS": "2",
    }

    def launch(repo: Path, port: int) -> subprocess.Popen[bytes]:
        return subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
                "--log-level",
                "warning",
            ],
            cwd=repo,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    user_process = launch(user_repo, user_port)
    gateway_process: subprocess.Popen[bytes] | None = None
    try:
        wait_ready(user_base, user_process)
        gateway_process = launch(gateway_repo, gateway_port)
        wait_ready(gateway_base, gateway_process)
        owner, other = uuid.uuid4(), uuid.uuid4()
        with httpx.Client(base_url=f"{gateway_base}/v1", timeout=5) as client:
            assert client.get("/race-missions/active").status_code == 401
            created = client.post("/race-missions", headers=headers(owner), json=PAYLOAD)
            assert created.status_code == 201, created.text
            assert created.headers["etag"] == '"1"'
            assert created.headers["cache-control"] == "no-store"
            mission_id = created.json()["id"]
            stop(user_process)
            unavailable = client.get("/race-missions/active", headers=headers(owner))
            assert unavailable.status_code == 502
            user_process = launch(user_repo, user_port)
            wait_ready(user_base, user_process)
            loaded = client.get("/race-missions/active", headers=headers(owner))
            assert loaded.json() == created.json()
            assert (
                client.get(f"/race-missions/{mission_id}", headers=headers(other)).status_code
                == 404
            )
            replay = client.post("/race-missions", headers=headers(owner), json=PAYLOAD)
            assert replay.json() == created.json()
            edit = {"goal": {"outcome": "finish"}, "correction_reason": "HTTP verification"}
            changed = client.patch(
                f"/race-missions/{mission_id}", headers=headers(owner), json=edit
            )
            assert changed.status_code == 200 and changed.headers["etag"] == '"2"'
            assert (
                client.patch(
                    f"/race-missions/{mission_id}", headers=headers(owner), json=edit
                ).status_code
                == 412
            )
            archive = client.post(
                f"/race-missions/{mission_id}/archive",
                headers=headers(owner, "http_archive", 2),
                json={"reason": "Smoke test done"},
            )
            assert archive.status_code == 200 and archive.json()["state"] == "archived"
            exported = client.get("/race-missions/data", headers=headers(owner))
            assert len(exported.json()["revisions"]) == 3
            deleted = client.request(
                "DELETE",
                "/race-missions/data",
                headers=headers(owner),
                json={"confirmation": "DELETE MY RACE MISSIONS"},
            )
            assert deleted.status_code == 204 and deleted.headers["cache-control"] == "no-store"
            assert (
                client.get("/race-missions/data", headers=headers(owner)).json()["missions"] == []
            )
    finally:
        if gateway_process is not None:
            stop(gateway_process)
        stop(user_process)
