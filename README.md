# Utility Outages Map

Real-time tracking and visualisation of utility outages across New Zealand.

---

## Project Structure

- **[`apps/scraper`](./apps/scraper)**: Python-based background service for data collection.
- **[`apps/api`](./apps/api)**: High-performance API using Robyn.
- **[`apps/web`](./apps/web)**: Frontend dashboard.
- **[`packages/shared`](./packages/shared)**: Shared logic and database models.
- **[`grafana`](./grafana)**: Monitoring and visualisation dashboards.

## Roadmap

- [x] TimescaleDB & PostGIS integration.
- [x] Electricity Outages.
- [x] Road Closures.
- [x] Scraper scheduling.
- [x] Grafana dashboards.
- [ ] Boil Water Notices.
- [ ] School Closures.
- [ ] Telco Outages.
- [x] API implementation.
- [ ] Interactive Web Map.

## Applications & Services

| Service | Port | Description |
| :--- | :--- | :--- |
| **API** | `8081` | Robyn API serving GeoJSON outages and stats. |
| **Grafana** | `3000` | Dashboards for monitoring and visualisation. |
| **Scraper** | `8080` (Internal) | Background service collecting data. |

## Prerequisites

- **[Bun](https://bun.sh/)**: For monorepo and workspace management (or `npm`, `pnpm`, `yarn`).
- **[uv](https://docs.astral.sh/uv/)**: For Python dependency and project management.
- **[Docker](https://docs.docker.com/get-docker/)**: For infrastructure (DB, Grafana).

## Getting Started

### 1. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`).

### 2. Install Dependencies
```bash
# Install dependencies
bun install

# Start infrastructure (DB, Grafana, and background runner)
docker compose up -d --build
```

### 3. Local Development
To run all applications concurrently:
```bash
bun run dev
```

## Monitoring & Logs

- **Grafana Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Scraper logs**: `docker compose logs -f python-app`

## Architecture Decisions

- **Monorepo**: Managed by **Turborepo** to keep services decoupled yet version-controlled together.
- **Hybrid Workflow**: Containers host infrastructure (DB, Grafana) and long-running jobs (Scraper), while the API and Web frontend run natively for a faster developer experience.
- **Containerised Scraper**: The scraper maintains its own `Dockerfile` for containerised deployment, while other apps are designed for native execution during development.

---

> [!NOTE]
> **Trade-offs**: This hybrid setup prioritises developer experience (speed, debugging). For production, all services can be fully containerised by adding Dockerfiles to `apps/api` and `apps/web`.
