"""Local browser-test fixture: real APIs, disposable SQLite DBs, no production data.

No source files, .env files, service definitions or deployed settings are changed.
Only this process's environment is configured. No AI/integration service is started.
"""

from contextlib import ExitStack
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time

import httpx

MOBILE = Path(__file__).resolve().parents[1]
WORKSPACE = MOBILE.parent
children = []


def stop_all(*_):
    for child in reversed(children):
        if child.poll() is None:
            if os.name == "nt":
                # Only process trees spawned by this fixture (including Metro).
                subprocess.run(["taskkill", "/PID", str(child.pid), "/T", "/F"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.killpg(child.pid, signal.SIGTERM)
            child.wait(timeout=10)


def launch(command, cwd, env):
    child = subprocess.Popen(command, cwd=cwd, env=env, start_new_session=os.name != "nt")
    children.append(child)
    return child


def ready(port):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        try:
            if httpx.get(f"http://127.0.0.1:{port}/health", timeout=0.5).status_code == 200:
                return
        except httpx.RequestError:
            pass
        time.sleep(0.1)
    raise RuntimeError(f"Test API {port} did not start")


def main():
    for port in (9510, 9511, 9512, 9513, 9514):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", port))  # Fail rather than reuse somebody else's service.
    with ExitStack() as stack:
        directory = stack.enter_context(tempfile.TemporaryDirectory(prefix="strem-browser-test-"))
        # Stop children before removing their DBs, including on startup failure.
        stack.callback(stop_all)
        env = {**os.environ, "JWT_SECRET": "isolated-browser-test-signing-secret-only",
               "JWT_ALGORITHM": "HS256", "REDIS_URL": "", "RATE_LIMIT_MAX": "2000",
               "AUTH_BASE_URL": "http://127.0.0.1:9512/v1",
               "USER_BASE_URL": "http://127.0.0.1:9513/v1",
               "TRAINING_BASE_URL": "http://127.0.0.1:9514/v1",
               "USER_SERVICE_BASE_URL": "http://127.0.0.1:9513/v1",
               "COURSE_STORAGE_BASE_URL": "http://127.0.0.1:9514",
               "AI_BASE_URL": "http://127.0.0.1:1/v1",
               "CORS_ALLOW_ORIGINS": "http://localhost:9510",
               "UPSTREAM_TIMEOUT_SECONDS": "15", "EXPO_PUBLIC_API_URL": "http://localhost:9511/v1",
               "EXPO_NO_DOTENV": "1", "CI": "1"}
        for service, port in (("auth", 9512), ("user", 9513), ("training", 9514)):
            repo = WORKSPACE / f"strem-{service}-service"
            service_env = {**env, "DATABASE_URL": f"sqlite+aiosqlite:///{Path(directory, service + '.db').as_posix()}"}
            subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"],
                           cwd=repo, env=service_env, check=True)
            launch([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
                    "--port", str(port)], repo, service_env)
            ready(port)
        launch([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
                "--port", "9511"], WORKSPACE / "strem-api-gateway", env)
        ready(9511)
        node = shutil.which("node")
        if not node:
            raise RuntimeError("Node is required")
        metro = launch([node, "node_modules/expo/bin/cli", "start", "--web", "--port", "9510", "--localhost", "--no-dev"], MOBILE, env)
        try:
            metro.wait()
        finally:
            stop_all()


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    try:
        main()
    finally:
        stop_all()
