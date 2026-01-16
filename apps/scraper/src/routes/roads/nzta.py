__all__ = ["nzta", "delays_transformer"]

from datetime import datetime
from typing import Any, Dict, List

from src.utils import Client

# TODO: automate region mapping from NZTA API
REGIONS = {
    37: "northland",
    7: "auckland",
    10: "waikato",
    11: "bay of plenty",
    13: "hawke's bay",
    14: "taranaki",
    12: "gisborne",
    15: "manawatū-whanganui",
    16: "wellington",
    17: "tasman",
    18: "nelson and marlborough",
    20: "west coast",
    21: "canterbury",
    22: "otago",
    38: "southland",
}

def delays_transformer(response: Any) -> List[Dict[str, Any]]:
    """Transforms raw NZTA API road delays into our standardised road closures format."""

    raw_data = response.json()
    transformed_events = []

    for feature in raw_data.get("features", []):
        props = feature.get("properties", {})
        
        # Basic details
        event_id = props.get("ExternalId")
        provider = "nzta"
        event_type = props.get("EventType", "unknown").lower()
        schedule_type = "planned" if props.get("IsPlanned", 0) == 1 else "unplanned"
        
        # Time details
        start_time = props.get("StartDate")
        end_time = props.get("EndDate")
        created_time = props.get("Created")
        
        last_updated_unix = props.get("lastUpdated")
        last_updated = datetime.fromtimestamp(last_updated_unix).isoformat() if last_updated_unix else None

        # Status calculation
        status = props.get("Status", "active").lower()
        now = datetime.now()
        
        start_dt = datetime.fromisoformat(start_time) if start_time else None
        end_dt = datetime.fromisoformat(end_time) if end_time else None

        if status == "active":
            if end_dt and end_dt < now:
                status = "resolved"
            elif start_dt and start_dt > now:
                status = "scheduled"
        elif status == "resolved":
             if end_dt and end_dt > now:
                status = "active"

        transformed_events.append({
            "id": str(event_id),
            "provider": provider,
            "category": "road_closure",
            "status": status,
            "event_type": event_type,
            "schedule_type": schedule_type,
            "start_time": start_time,
            "end_time": end_time,
            "created_time": created_time, 
            "last_updated": last_updated,
            "description": props.get('EventDescription'),
            "comments": props.get('EventComments'),
            "impact": props.get("Impact"),
            "region": [REGIONS.get(region) for region in props.get("regions", [])],
            "location_description": props.get('LocationArea'),
            "location_geometry": feature.get("geometry"), # GeoJSON standard
            "detour_description": props.get("AlternativeRoute"),
            "expected_resolution": props.get("ExpectedResolutionText")
        })

    return transformed_events


nzta = Client(
    "nzta",
    "www.journeys.nzta.govt.nz",
    endpoints={
        "delays": {
            "path": "/assets/map-data-cache/delays.json",
            "transformer": delays_transformer
            # "transformer": lambda resp: resp.json()
        },
        # "vms": "/assets/map-data-cache/vms.json",
    },
)
