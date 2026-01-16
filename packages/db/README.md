# Shared Package for Utility Outage

This package contains shared database models and connection logic used by both the API and the Scraper.

## Usage in Workspaces

To use this package in an app or another package within this monorepo, add it to your `pyproject.toml`:

```toml
[project]
dependencies = [
    "shared",
]

[tool.uv.sources]
shared = { path = "../../packages/shared" }
```

Then run `uv sync` to link the dependency.
