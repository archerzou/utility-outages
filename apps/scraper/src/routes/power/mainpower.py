# North Canterbury and Kaikoura

__all__ = ["mainpower", "mainpower_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status, parse_timestamp

def mainpower_transformer(response):
    """Transforms raw MainPower API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)
    
    job_categories = ["planned_jobs", "unplanned_jobs", "current_jobs"]

    for category in job_categories:
        for job_id, outage in raw_data.get(category, {}).items():
            
            start_time_str = outage.get("ActualStartTime") or outage.get("PlannedStartTime")
            end_time_str = outage.get("ActualEndTime") or outage.get("PlannedEndTime")
            alt_start_str = outage.get("AlternateStartTime")
            
            # Parse timestamps using utility (MainPower uses a non-standard date format)
            start_time = parse_timestamp(start_time_str, format="%d/%m/%Y %H:%M")
            end_time = parse_timestamp(end_time_str, format="%d/%m/%Y %H:%M")
            alt_start_time = parse_timestamp(alt_start_str, format="%d/%m/%Y %H:%M")

            # Status Calculation using utility
            is_complete = outage.get("Status") == "Complete"
            status = calculate_status(
                start_time=start_time,
                end_time=end_time,
                now=now,
                is_restored=is_complete,
                has_alternate_date=outage.get("Deferred", False)
            )

            # Location Geometry
            geometry = None
            if plans := outage.get("plans"):
                first_plan = next(iter(plans.values()), None)
                if first_plan and (props := first_plan.get("properties")):
                    if (lat := props.get("Lat")) and (lon := props.get("Lon")):
                        geometry = {"type": "Point", "coordinates": [lon, lat]}

            # Reschedule History
            reschedule_history = []
            if outage.get("Deferred") and alt_start_time and start_time != alt_start_time:
                reschedule_history.append({
                    "original_start_time": start_time,
                    "new_start_time": alt_start_time,
                    "reason": "Rescheduled to alternate date."
                })

            transformed_outages.append({
                "id": outage.get("JobId"),
                "provider": "mainpower",
                "category": "power_outage",
                "status": status,
                "schedule_type": "planned" if outage.get("Type") == "Planned" else "unplanned",
                "start_time": start_time,
                "end_time": end_time,
                "last_updated": None,
                "fetched_at": now.isoformat(),
                "cause": outage.get("Reason"),
                "location_description": outage.get("Area"),
                "location_geometry": geometry,
                "region": "canterbury",
                "affected_customers": outage.get("CustomersOff"),
                "information_url": "https://outages.mainpower.co.nz/",
                "comments": outage.get("Updates") or outage.get("Reason"),
                "latest_update": outage.get("Updates"),
                "reschedule_history": reschedule_history
            })
            
    return transformed_outages

mainpower = Client(
    name="mainpower",
    host="outages.mainpower.co.nz",
    endpoints={
        "outages": "/jobs"
    },
    default_transformer=mainpower_transformer
)
