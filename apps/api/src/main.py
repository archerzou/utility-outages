from robyn import Robyn, Request, Response
from robyn.openapi import OpenAPI, OpenAPIInfo, Contact, License
from routes import get_outages, get_stats, get_providers, get_regions
from schemas import (
    OutagesQueryParams,
    OutagesResponse,
    StatsResponse,
    ProvidersResponse,
    RegionsResponse,
)
import os


# App Configuration

app = Robyn(
    __file__,
    openapi=OpenAPI(
        info=OpenAPIInfo(
            title="Utility Outage API",
            description="REST API for the Utility Outage Map. Provides real-time information about power outages and road events across New Zealand.",
            version="1.0.0",
            contact=Contact(
                name="Utility Outage Map",
                url="https://github.com/amooo-ooo/utility-outage",
            ),
            license=License(
                name="MIT",
                url="https://opensource.org/licenses/MIT",
            ),
        ),
    ),
)


# --- Routes ---

@app.get("/", openapi_name="Root", openapi_tags=["General"])
async def root(request: Request):
    """Root endpoint returning API version info."""
    return Response(status_code=200, headers={"Content-Type": "text/plain"}, description="Outage Map API v1")


@app.get("/api/v1/outages", openapi_name="Get Outages", openapi_tags=["Outages"])
async def outages_route(request: Request, query_params: OutagesQueryParams) -> OutagesResponse:
    """Retrieve power outages and road events with optional filtering.
    
    **Example requests:**
    
    - Get all active power outages:
      `GET /api/v1/outages?types=power&status=Active`
    
    - Get road events in Canterbury region:
      `GET /api/v1/outages?types=road&region=Canterbury`
    
    - Get outages from a specific provider:
      `GET /api/v1/outages?provider=MainPower`
    
    - Get all outages from a specific date range:
      `GET /api/v1/outages?status=All&start_time=2024-01-01T00:00:00Z&end_time=2024-01-31T23:59:59Z`
    
    **Example response:**
    ```json
    {
        "outages": [
            {
                "id": "mainpower-12345",
                "provider": "MainPower",
                "type": "power",
                "start_time": "2024-01-15T08:00:00+13:00",
                "end_time": "2024-01-15T16:00:00+13:00",
                "fetched_at": "2024-01-15T07:30:00+13:00",
                "last_updated": "2024-01-15T10:00:00+13:00",
                "category": "Unplanned",
                "status": "Active",
                "schedule_type": "unplanned",
                "cause": "Equipment failure",
                "location": "123 Main Street, Rangiora",
                "region": "Canterbury",
                "affected_customers": 250,
                "information_url": "https://example.com/outage/12345",
                "comments": "Crews on site",
                "latest_update": "Repair work underway",
                "geometry": {
                    "type": "Point",
                    "coordinates": [172.5, -43.3]
                }
            }
        ]
    }
    ```
    """
    # Access query params from request.query_params (the typed class is for OpenAPI docs)
    params = request.query_params
    
    # Parse pagination params with proper type conversion
    limit = params.get("limit", None)
    offset = params.get("offset", None)
    
    data = get_outages(
        types=params.get("types", None),
        status=params.get("status", None),
        region=params.get("region", None),
        provider=params.get("provider", None),
        start_time=params.get("start_time", None),
        end_time=params.get("end_time", None),
        limit=int(limit) if limit else None,
        offset=int(offset) if offset else None
    )
    return data


@app.get("/api/v1/stats", openapi_name="Get Statistics", openapi_tags=["Statistics"])
async def stats_route(request: Request) -> StatsResponse:
    """Get aggregate statistics for active outages, grouped by type.
    
    Example response:
    ```json
    {
        "power": {
            "activeCount": 5,
            "affectedCustomers": 1250,
            "regions": {
                "Canterbury": 3,
                "Otago": 2
            }
        },
        "road": {
            "activeCount": 2,
            "regions": {}
        }
    }
    ```
    """
    data = get_stats()
    return data


@app.get("/api/v1/providers", openapi_name="Get Providers", openapi_tags=["Discovery"])
async def providers_route(request: Request) -> ProvidersResponse:
    """List all unique data providers.
    
    Returns separate lists of power and road event providers that have data in the system.
    Use these values with the `provider` filter on the `/api/v1/outages` endpoint.
    
    Example response:
    ```json
    {
        "power": ["MainPower", "Orion", "Alpine Energy"],
        "road": ["NZTA"]
    }
    ```
    """
    data = get_providers()
    return data


@app.get("/api/v1/regions", openapi_name="Get Regions", openapi_tags=["Discovery"])
async def regions_route(request: Request) -> RegionsResponse:
    """List all unique regions with outage data.
    
    Returns separate lists of regions for power and road events.
    Use these values with the `region` filter on the `/api/v1/outages` endpoint.
    
    Example response:
    ```json
    {
        "power": ["Canterbury", "Otago", "Southland"],
        "road": []
    }
    ```
    """
    data = get_regions()
    return data


if __name__ == "__main__":
    # Get port from env or default to 8081
    port = int(os.getenv("API_PORT", 8081))
    host = "0.0.0.0"
    app.start(port=port, host=host)

