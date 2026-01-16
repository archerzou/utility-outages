# Christchurch and Central Canterbury

__all__ = ["orion", "orion_transformer"]

from datetime import datetime, timezone, timedelta

from src.utils import Client
from src.utils.transformers import calculate_status

def orion_transformer(response):
    """Transforms raw Orion API response into our standardised outage format."""

    raw_data = response.json()
    data_timestamp = raw_data.get("TimeStamp")

    transformed_outages = []
    outage_categories = ["CurrentOutages", "PlannedOutages", "RecentOutages"]
    now = datetime.now(timezone.utc)
    local_tz = timezone(timedelta(hours=13))

    for category in outage_categories:
        for outage in raw_data.get(category, []):

            start_time = outage.get("TimeDown") or outage.get("PlannedStart")
            end_time = outage.get("TimeUp") or outage.get("EstTimeUp") or outage.get("PlannedEnd")
            alternate_date = outage.get("AlternateDate")

            # Ensure timezone awareness for Orion timestamps
            start_dt = None
            if start_time:
                start_dt = datetime.fromisoformat(start_time)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(tzinfo=local_tz)
                start_time = start_dt.isoformat()

            end_dt = None
            if end_time:
                end_dt = datetime.fromisoformat(end_time)
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=local_tz)
                end_time = end_dt.isoformat()

            # Status Calculation using utility
            api_state = outage.get("State", "")
            is_closed = api_state == "CLOSED"
            is_cancelled = api_state == "Cancelled"
            
            status = calculate_status(
                start_time=start_time,
                end_time=end_time,
                now=now,
                api_status=api_state,
                is_restored=is_closed,
                is_cancelled=is_cancelled,
                has_alternate_date=bool(alternate_date)
            )

            # Location Geometry
            geometry = None
            if (lat := outage.get("Latitude")) and (lon := outage.get("Longitude")):
                if lat != 0 and lon != 0:
                    geometry = {"type": "Point", "coordinates": [lon, lat]}

            # Reschedule History
            reschedule_history = []
            if alternate_date and outage.get("PlannedStart") != alternate_date:
                reschedule_history.append({
                    "original_start_time": outage.get("PlannedStart"),
                    "new_start_time": alternate_date,
                    "reason": "Rescheduled to alternate date."
                })

            transformed_outages.append({
                "id": str(outage.get("Id")),
                "provider": "orion",
                "category": "power_outage",
                "status": status,
                "schedule_type": "planned" if outage.get("Planned") else "unplanned",
                "start_time": start_time,
                "end_time": end_time,
                "last_updated": outage.get("TimeUp") or outage.get("TimeDown") or data_timestamp,
                "fetched_at": now.isoformat(),
                "cause": outage.get("OutageCause"),
                "location_description": f"{outage.get('Areas', '')}: {outage.get('Streets', '')}",
                "location_geometry": geometry,
                "region": "canterbury",
                "affected_customers": outage.get("MaxNumberOff"),
                "information_url": f"https://outages.oriongroup.co.nz/#/outage/{outage.get('Id')}",
                "comments": outage.get("PublicComments"),
                "latest_update": outage.get("PublicComments"),
                "reschedule_history": reschedule_history
            })

    return transformed_outages

orion = Client(
    name="orion",
    host="outages.oriongroup.co.nz",
    endpoints={
        "outages": "/api/v1/outages.json"
    },
    default_transformer=orion_transformer
)
