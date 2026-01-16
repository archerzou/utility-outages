# Nelson (Network Tasman)

__all__ = ["nelson", "nelson_transformer"]

from datetime import datetime, timezone, timedelta

from src.utils import Client
from src.utils.transformers import calculate_status

def nelson_transformer(response):
    """Transforms raw Network Tasman API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)
    local_tz = timezone(timedelta(hours=13)) # NZ Daylight Time

    for outage in raw_data:
        # Parse timestamps
        # Format: "2025-11-28T09:30:00" - ISO format, naive (assume local NZ time)
        start_time = outage.get("StartValue")
        end_time = outage.get("FinishValue")
        
        # Ensure timezone awareness
        start_dt = None
        if start_time:
            try:
                start_dt = datetime.fromisoformat(start_time)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=local_tz)
                start_time = start_dt.isoformat()
            except ValueError:
                pass

        end_dt = None
        if end_time:
            try:
                end_dt = datetime.fromisoformat(end_time)
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=local_tz)
                end_time = end_dt.isoformat()
            except ValueError:
                pass

        # Status Calculation
        api_status = outage.get("AlertStatus")
        is_restored = outage.get("Restored", False)
        
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now,
            api_status=api_status,
            is_restored=is_restored
        )

        # Reschedule History
        reschedule_history = []
        alt_start = outage.get("AltStartDate")
        if alt_start:
             # Check if it looks like a real date and not just a placeholder if logic needed
             # For now just storing it if present and different from start might be complex without more data
             # The example shows "AltStartDate": "2025-12-01T00:00:00"
             pass

        transformed_outages.append({
            "id": f"nel-{start_time}-{outage.get('OutageAreaDetails')}"[:50], # Generate a deterministic ID as none is provided
            "provider": "network_tasman",
            "category": "power_outage",
            "status": status,
            "schedule_type": "planned" if outage.get("OutageType") == "Planned" else "unplanned",
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": outage.get("lastupdated"), # Note: this might also need TZ handling if naive
            "fetched_at": now.isoformat(),
            "cause": outage.get("reason"),
            "location_description": f"{outage.get('OutageAreaDetails', '')}, {outage.get('OutageArea', '')}",
            "location_geometry": None, # No coordinates provided
            "region": "nelson_tasman",
            "affected_customers": None,
            "information_url": "https://networktasman.co.nz/outages",
            "comments": outage.get("reason"),
            "latest_update": outage.get("estrestoreinfo"),
            "reschedule_history": reschedule_history
        })

    return transformed_outages

nelson = Client(
    name="network_tasman",
    host="networktasman.co.nz",
    endpoints={
        "outages": "/wp-content/uploads/outages/outages.json"
    },
    default_transformer=nelson_transformer
)