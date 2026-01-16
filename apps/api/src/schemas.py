from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class OutageBase(BaseModel):
    id: str
    provider: str
    start_time: datetime
    category: Optional[str] = None
    status: Optional[str] = None
    cause: Optional[str] = None
    location_description: Optional[str] = None
    region: Optional[str] = None
    affected_customers: Optional[int] = None
    information_url: Optional[str] = None

class PowerOutageSchema(OutageBase):
    end_time: Optional[datetime] = None
    latest_update: Optional[str] = None
    # geometry skipped or handled as GeoJSON dict
    location_geometry: Optional[Dict[str, Any]] = None

class RoadEventSchema(OutageBase):
    event_type: Optional[str] = None
    impact: Optional[str] = None
    location_geometry: Optional[Dict[str, Any]] = None

class OutageStats(BaseModel):
    total_active: int
    total_affected_consumers: int
    by_provider: Dict[str, int]
    by_region: Dict[str, int]

class ProviderInfo(BaseModel):
    name: str
    type: str # power or road


# --- OpenAPI Documentation Models ---
# These models are used for Robyn's automatic OpenAPI/Swagger documentation

from robyn.types import JSONResponse
from robyn.robyn import QueryParams


class OutagesQueryParams(QueryParams):
    """Query parameters for the outages endpoint."""
    types: str = "power,road"  # Comma-separated: "power", "road", or "power,road"
    status: str = "Active"  # One of: Active, Restored, Scheduled, All
    region: Optional[str] = None  # Region name - use GET /api/v1/regions to list valid values
    provider: Optional[str] = None  # Provider name - use GET /api/v1/providers to list valid values
    start_time: Optional[str] = None  # ISO8601 datetime (e.g., 2024-01-01T00:00:00Z)
    end_time: Optional[str] = None  # ISO8601 datetime (e.g., 2024-01-31T23:59:59Z)
    limit: int = 1000  # Max results to return (max: 5000)
    offset: int = 0  # Number of results to skip for pagination


class OutageItem(JSONResponse):
    """Single outage/event item."""
    id: str
    provider: str
    type: str  # "power" or "road"
    start_time: Optional[str]
    end_time: Optional[str]
    fetched_at: Optional[str]
    last_updated: Optional[str]
    category: Optional[str]
    status: Optional[str]
    schedule_type: Optional[str]
    cause: Optional[str]
    location: Optional[str]
    region: Optional[str]
    affected_customers: Optional[int]
    information_url: Optional[str]
    comments: Optional[str]
    latest_update: Optional[str]
    geometry: Optional[Dict[str, Any]]


class OutagesResponse(JSONResponse):
    """Response containing list of outages."""
    outages: List[OutageItem]


class PowerStats(JSONResponse):
    """Statistics for power outages."""
    activeCount: int
    affectedCustomers: int
    regions: Dict[str, int]


class RoadStats(JSONResponse):
    """Statistics for road events."""
    activeCount: int
    regions: Dict[str, int]


class StatsResponse(JSONResponse):
    """Aggregate statistics response grouped by type."""
    power: PowerStats
    road: RoadStats


class ProvidersResponse(JSONResponse):
    """List of data providers."""
    power: List[str]
    road: List[str]


class RegionsResponse(JSONResponse):
    """List of regions with outage data."""
    power: List[str]
    road: List[str]
