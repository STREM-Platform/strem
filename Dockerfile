# --- Builder stage: install dependencies into an isolated prefix ---
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Final stage: copy installed deps + app, run uvicorn ---
FROM python:3.12-slim

WORKDIR /app

# Run as a non-root user.
RUN useradd --create-home --uid 1001 strem

COPY --from=builder /install /usr/local
COPY app ./app

USER strem

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
