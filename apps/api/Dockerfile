# Build stage: Install dependencies
FROM python:3.13-slim-bookworm AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install build dependencies for geospatial libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy python-specific manifests for caching
COPY apps/api/pyproject.toml apps/api/uv.lock ./apps/api/
COPY packages/db/ ./packages/db/

# Install dependencies into a virtual environment
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN --mount=type=cache,target=/root/.cache/uv \
    cd apps/api && \
    uv sync --frozen

# Final stage: Runner
FROM python:3.13-slim-bookworm AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root user
RUN groupadd -g 1000 appuser && \
    useradd -m -u 1000 -g appuser -s /bin/bash appuser

WORKDIR /home/appuser

# Copy virtual environment from builder
COPY --from=builder --chown=appuser:appuser /opt/venv /opt/venv
COPY --from=builder /bin/uv /bin/uvx /usr/local/bin/
ENV PATH="/opt/venv/bin:$PATH"
ENV VIRTUAL_ENV=/opt/venv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv

# Copy source code
COPY --chown=appuser:appuser apps/api/ ./apps/api/
COPY --chown=appuser:appuser packages/db/ ./packages/db/

# Add packages/db to PYTHONPATH so it can be imported
ENV PYTHONPATH="/home/appuser/packages/db:$PYTHONPATH"

# Ensure the app user owns the directories
RUN chown -R appuser:appuser /home/appuser

USER appuser
WORKDIR /home/appuser/apps/api

# Expose API port
EXPOSE 8081

# Run the API server
CMD ["python", "src/main.py"]
