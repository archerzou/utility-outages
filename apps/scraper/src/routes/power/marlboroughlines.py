# Marlborough Lines

__all__ = ["marlboroughlines", "marlboroughlines_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status

def marlboroughlines_transformer(response):
    """Transforms raw Marlborough Lines API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)

    for outage in raw_data:
        # Parse timestamps
        # Format: "2025-11-28T08:30:00+13:00" - ISO format with offset
        start_time = outage.get("outageStartTime")
        end_time = outage.get("outageEndTime") or outage.get("estimatedTimeOfRestoral")
        
        # Status Calculation
        is_verified = outage.get("verified", False)
        # If not verified, it might be a new report. 
        # But we primarily rely on start/end times and explicit status if available.
        # The API doesn't seem to have a specific status field other than 'outageWorkStatus' which is often empty in the example.
        
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now
        )

        # Location Geometry
        geometry = None
        if (point := outage.get("outagePoint")) and point.get("lng") and point.get("lat"):
            geometry = {
                "type": "Point", 
                "coordinates": [point["lng"], point["lat"]]
            }

        # Location Description
        streets = outage.get("streetsAffected", [])
        location_desc = ", ".join(streets) if streets else "Marlborough Area"

        transformed_outages.append({
            "id": str(outage.get("outageRecID")),
            "provider": "marlborough_lines",
            "category": "power_outage",
            "status": status,
            "schedule_type": "planned" if outage.get("isPlanned") else "unplanned",
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": outage.get("outageModifiedTime"),
            "fetched_at": now.isoformat(),
            "cause": outage.get("cause"),
            "location_description": location_desc,
            "location_geometry": geometry,
            "region": "marlborough",
            "affected_customers": outage.get("customersOutNow"),
            "information_url": "https://www.marlboroughlines.co.nz/outages",
            "comments": outage.get("outageName") or outage.get("outageWorkStatus"),
            "latest_update": outage.get("outageWorkStatus"),
            "reschedule_history": []
        })

    return transformed_outages

marlboroughlines = Client(
    name="marlborough_lines",
    host="outagemap.marlboroughlines.co.nz",
    endpoints={
        "current": "/data/outages.json?v=2",
        "planned": "/data/plannedOutages.json?v=2"
    },
    default_transformer=marlboroughlines_transformer,
    verify=False
)