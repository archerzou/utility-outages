# Mid Canterbury and Ashburton

__all__ = ["eanetworks", "eanetworks_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status

def eanetworks_transformer(response):
    """Transforms raw EANetworks API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)
    data_timestamp = raw_data.get("lastUpdated")

    for outage in raw_data.get("outages", []):
        start_time = outage.get("start_time")
        end_time = outage.get("estimated_end_time")
        actual_end_time = outage.get("end_time")
        alt_start = outage.get("alternate_start_date")

        # Status Calculation using utility
        status = calculate_status(
            start_time=start_time,
            end_time=actual_end_time or end_time,
            now=now,
            has_alternate_date=outage.get("postponed", False)
        )
        
        # Location Geometry (already provided)
        geometry = outage.get("polygon")

        # Reschedule History
        reschedule_history = []
        if outage.get("postponed") and alt_start and start_time != alt_start:
            reschedule_history.append({
                "original_start_time": start_time,
                "new_start_time": alt_start,
                "reason": "Rescheduled to alternate date."
            })

        transformed_outages.append({
            "id": outage.get("outage_id"),
            "provider": "ea_networks",
            "category": "power_outage",
            "status": status,
            "schedule_type": "planned" if outage.get("outage_type") == "PLANNED_OUTAGE" else "unplanned",
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": outage.get("updated_at") or data_timestamp,
            "fetched_at": now.isoformat(),
            "cause": outage.get("reason"),
            "location_description": outage.get("streets_affected"),
            "location_geometry": geometry,
            "region": "canterbury",
            "affected_customers": outage.get("total_affected_customers"),
            "information_url": f"https://outages.eanetworks.co.nz/outage/{outage.get('outage_id')}",
            "comments": None,
            "latest_update": None,
            "reschedule_history": reschedule_history
        })
            
    return transformed_outages

eanetworks = Client(
    name="eanetworks",
    host="outages-eanetworks-co-nz.vercel.app/api",
    endpoints={
        "current": "/get-outages?tab=current",
        "planned": "/get-outages?tab=planned"
    },
    default_transformer=eanetworks_transformer
)
