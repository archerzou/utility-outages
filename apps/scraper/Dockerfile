# Build stage 1: Prune the monorepo
FROM node:20-slim AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune scraper --docker

# Build stage 2: Install dependencies
FROM python:3.13-slim-bookworm AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install build dependencies for geospatial and XML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libproj-dev \
    proj-bin \
    libgeos-dev \
    libxml2-dev \
    libxslt1-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pruned manifests from pruner stage
COPY --from=pruner /app/out/json/ .
# Copy python-specific manifests for caching
# We include the whole packages/db because uv needs to resolve the local dependency
COPY apps/scraper/pyproject.toml apps/scraper/uv.lock ./apps/scraper/
COPY packages/db/ ./packages/db/

# Install dependencies into a virtual environment
# We use --no-install-project to cache dependencies independently of source code
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN --mount=type=cache,target=/root/.cache/uv \
    cd apps/scraper && \
    uv sync --frozen --no-install-project

# Build stage 3: Final runner
FROM python:3.13-slim-bookworm AS runner

# Install runtime dependencies (geospatial libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libproj-dev \
    proj-bin \
    libgeos-dev \
    libxml2-dev \
    libxslt1-dev \
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

# Copy source code from pruner stage (out/full contains only relevant workspaces)
COPY --from=pruner --chown=appuser:appuser /app/out/full/ .

# Ensure the app user owns the directories
RUN chown -R appuser:appuser /home/appuser

USER appuser
WORKDIR /home/appuser/apps/scraper

# Keep original port and command for compatibility
EXPOSE 8080

# Default to sleep for dev workflow, but can be overridden for prod
CMD ["sleep", "infinity"]