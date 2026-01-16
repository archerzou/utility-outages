# Kāpiti and Horowhenua districts

__all__ = ["electra", "electra_transformer", "electra_planned_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status

def electra_transformer(response):
    """Transforms raw Electra API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)

    for outage in raw_data:
        start_time = outage.get("outageStartTime")
        end_time = outage.get("estimatedTimeOfRestoral")
        last_updated = outage.get("outageModifiedTime")
        
        # Parse timestamps to ensure they're in ISO 8601 format
        start_dt = None
        if start_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                start_time = start_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        end_dt = None
        if end_time:
            try:
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                end_time = end_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        if last_updated:
            try:
                last_updated_dt = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                last_updated = last_updated_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        # Status Calculation using utility
        api_status = outage.get("outageStatus", "")
        is_restored = outage.get("customersAffected", 0) > 0 and outage.get("customersRestored", 0) == outage.get("customersAffected", 0)
        
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now,
            api_status=api_status,
            is_restored=is_restored
        )
        
        # Location Geometry - use polygon if available, otherwise centre point
        geometry = None
        if outage.get("_outagePolygon"):
            # Convert polygon coordinates to GeoJSON format
            coordinates = [[
                [point["lng"], point["lat"]] 
                for point in outage["_outagePolygon"]
            ]]
            geometry = {
                "type": "Polygon",
                "coordinates": coordinates
            }
        elif outage.get("_centre_lng") and outage.get("_centre_lat"):
            geometry = {
                "type": "Point",
                "coordinates": [outage["_centre_lng"], outage["_centre_lat"]]
            }
        
        # Calculate affected customers (total - restored)
        customers_affected = outage.get("customersAffected", 0)
        customers_restored = outage.get("customersRestored", 0)
        current_affected = max(0, customers_affected - customers_restored)
        
        # Determine schedule type based on cause
        cause = outage.get("cause", "")
        schedule_type = "planned" if cause and "maintenance" in cause.lower() else "unplanned"
        
        transformed_outages.append({
            "id": outage.get("outageRecID"),
            "provider": "electra",
            "category": "power_outage",
            "status": status,
            "schedule_type": schedule_type,
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": last_updated,
            "fetched_at": now.isoformat(),
            "cause": cause or None,
            "location_description": outage.get("areasAffected"),
            "location_geometry": geometry,
            "region": "manawatu-whanganui",
            "affected_customers": current_affected if status in ["active", "scheduled"] else None,
            "information_url": "https://electra.co.nz/outages/",
            "comments": f"Status: {api_status}. {customers_restored} of {customers_affected} customers restored." if customers_affected > 0 else None,
            "latest_update": f"Status: {api_status}. {customers_restored} of {customers_affected} customers restored." if customers_affected > 0 else None,
            "reschedule_history": []
        })
    
    return transformed_outages

def electra_planned_transformer(response):
    """Transforms raw Electra planned outages API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)

    for outage in raw_data:
        primary_start = outage.get("primaryStartTimeUTC")
        primary_end = outage.get("primaryEndTimeUTC")
        secondary_start = outage.get("secondaryStartTimeUTC")
        secondary_end = outage.get("secondaryEndTimeUTC")
        last_updated = outage.get("updatedTime")
        
        # Parse timestamps to ensure they're in ISO 8601 format
        start_time = None
        if primary_start:
            try:
                start_dt = datetime.fromisoformat(primary_start.replace('Z', '+00:00'))
                start_time = start_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        end_time = None
        if primary_end:
            try:
                end_dt = datetime.fromisoformat(primary_end.replace('Z', '+00:00'))
                end_time = end_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        alt_start_time = None
        if secondary_start:
            try:
                alt_start_dt = datetime.fromisoformat(secondary_start.replace('Z', '+00:00'))
                alt_start_time = alt_start_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        if last_updated:
            try:
                last_updated_dt = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                last_updated = last_updated_dt.isoformat()
            except (ValueError, AttributeError):
                pass
        
        # Status Calculation using utility
        api_status = outage.get("jobStatus", "")
        is_cancelled = api_status.lower() in ['cancelled', 'canceled']
        
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now,
            api_status=api_status,
            is_cancelled=is_cancelled,
            has_alternate_date=bool(alt_start_time)
        )
        
        # Location Geometry - use centre point with radius
        geometry = None
        if outage.get("_centre_lng") and outage.get("_centre_lat"):
            geometry = {
                "type": "Point",
                "coordinates": [outage["_centre_lng"], outage["_centre_lat"]]
            }
        
        # Build location description from area and streets
        affected_streets = outage.get("affectedStreetsList", "")
        job_area = outage.get("jobArea", "")
        location_desc = f"{job_area}: {affected_streets}" if job_area else affected_streets
        
        # Reschedule History
        reschedule_history = []
        if alt_start_time and start_time != alt_start_time:
            reschedule_history.append({
                "original_start_time": start_time,
                "new_start_time": alt_start_time,
                "reason": "Rescheduled to secondary date."
            })
        
        transformed_outages.append({
            "id": outage.get("jobID"),
            "provider": "electra",
            "category": "power_outage",
            "status": status,
            "schedule_type": "planned",
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": last_updated,
            "fetched_at": now.isoformat(),
            "cause": outage.get("reason"),
            "location_description": location_desc,
            "location_geometry": geometry,
            "region": "manawatu-whanganui",
            "affected_customers": outage.get("numAffected") if status in ["active", "scheduled", "postponed"] else None,
            "information_url": "https://electra.co.nz/outages/",
            "comments": f"Status: {api_status}. Affects {outage.get('numAffected', 0)} customers." if outage.get('numAffected') else None,
            "latest_update": f"Status: {api_status}. Affects {outage.get('numAffected', 0)} customers." if outage.get('numAffected') else None,
            "reschedule_history": reschedule_history
        })
    
    return transformed_outages

electra = Client(
    name="electra",
    host="electra.co.nz",
    endpoints={
        "current": {
            "path": "/wp-json/electra/v1/current-outage",
            "transformer": electra_transformer
        },
        "planned": {
            "path": "/wp-json/electra/v1/planned-outage",
            "transformer": electra_planned_transformer
        }
    }
)
