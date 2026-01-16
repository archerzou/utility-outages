# Dunedin, Central Otago, and Queenstown Lakes

__all__ = ["aurora", "aurora_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status

def aurora_transformer(response):
    """Transforms raw Aurora Energy API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)

    for feature in raw_data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        
        # Process each grouped outage within this event
        for group in props.get("groupOutages", []):
            # Parse ISO 8601 timestamps
            start_time = group.get("StartDateTime")
            end_time = group.get("EndDateTime")
            
            # Status Calculation using utility
            event_status = props.get("eventStatus", "")
            is_cancelled = event_status.lower() == "cancelled"
            is_restored = props.get("isRestored", False)
            
            status = calculate_status(
                start_time=start_time,
                end_time=end_time,
                now=now,
                is_restored=is_restored,
                is_cancelled=is_cancelled
            )

            # Location Geometry (already in WGS84)
            geometry = None
            if coords := geom.get("coordinates"):
                if len(coords) == 2 and coords[0] != 0 and coords[1] != 0:
                    geometry = {"type": "Point", "coordinates": coords}

            transformed_outages.append({
                "id": f"{props.get('eventNumber')}-{group.get('Id')}",
                "provider": "aurora_energy",
                "category": "power_outage",
                "status": status,
                "schedule_type": "planned",
                "start_time": start_time,
                "end_time": end_time,
                "last_updated": None,
                "fetched_at": now.isoformat(),
                "cause": props.get("eventCause"),
                "location_description": f"{props.get('town', '')}: {group.get('Streets', '')}",
                "location_geometry": geometry,
                "region": "otago",
                "affected_customers": group.get("AffectedCustomers"),
                "information_url": "https://www.auroraenergy.co.nz/outages/planned-outages",
                "comments": props.get("latestPublicWebsiteMessageLog"),
                "latest_update": props.get("latestPublicWebsiteMessageLog"),
                "reschedule_history": []
            })
        
    return transformed_outages

aurora = Client(
    name="aurora_energy",
    host="www.auroraenergy.co.nz",
    endpoints={
        "current": "/Umbraco/Api/Outage/currentCenterPoints?daterange=All",
        "planned": "/Umbraco/Api/Outage/plannedCenterPoints?daterange=All",
        "restored": "/Umbraco/Api/Outage/restoredCenterPoints?daterange=All"
    },
    default_transformer=aurora_transformer
)
