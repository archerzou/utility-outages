# Southern Auckland and Northern Waikato

__all__ = ["counties", "counties_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status

def counties_transformer(response, is_planned=False):
    """Transforms raw Counties Energy API response into our standardised outage format.
    
    Args:
        response: HTTP response object
        is_planned: Whether this is planned outages endpoint (different field names)
    """
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)
    
    # Handle different data keys between endpoints
    data_key = "planned_outages" if is_planned else "service_orders"
    
    for order in raw_data.get(data_key, []):
        # Field mapping between endpoints
        if is_planned:
            # Planned outages endpoint
            shutdown_periods = order.get("shutdownPeriods", [])
            start_time = shutdown_periods[0].get("start") if shutdown_periods else None
            end_time = shutdown_periods[-1].get("end") if shutdown_periods else None
            last_updated = order.get("lastModified")
            api_status = order.get("statusText", "")
            is_cancelled = api_status.upper() == "CANCELLED"
            schedule_type = "planned"
            outage_id = order.get("id")
            cause = order.get("projectType")
            affected_customers = order.get("affectedCustomers")
            comments = order.get("latestInformation") or None
            latest_update = order.get("latestInformation") or order.get("statusText")
            
            # Location description
            address = order.get("address", "").strip()
            feeder = order.get("feeder", "")
            location_parts = [p for p in [address, feeder] if p]
            location_description = ": ".join(location_parts) if location_parts else None
            
            # Reschedule history
            reschedule_history = []
            original_shutdown_date = order.get("originalShutdownDateTime")
            original_periods = order.get("originalShutdownPeriods", [])
            if original_shutdown_date and original_periods:
                original_start = original_periods[0].get("start") if original_periods else None
                reschedule_history.append({
                    "original_start_time": original_start or original_shutdown_date,
                    "new_start_time": start_time,
                    "reason": "Rescheduled to alternate date."
                })
        else:
            # Current outages endpoint
            start_time = order.get("serviceOrderDateTime")
            last_updated = order.get("lastModified")
            
            # Parse end time from etrDateTime
            end_time = None
            etr_datetime = order.get("etrDateTime")
            if etr_datetime and isinstance(etr_datetime, dict):
                end_time = etr_datetime.get("end")
            
            api_status = order.get("status", "")
            is_cancelled = False
            
            # Determine schedule type
            service_type = order.get("serviceType", "")
            schedule_type = "planned" if service_type in ["MAINT", "PLANNED"] else "unplanned"
            
            outage_id = order.get("no")
            cause = order.get("description")
            affected_customers = order.get("customersAffected")
            comments = order.get("comments") or None
            
            # Latest update
            crew_status = order.get('crewStatus', '')
            est_restoration = order.get('estimatedRestoration', '')
            latest_update = f"{crew_status} - {est_restoration}".strip(" -") if crew_status or est_restoration else None
            
            # Location description
            address = order.get("address", "").strip()
            feeder_code = order.get("feederCode", "")
            feeder_category = order.get("feederCategory", "")
            location_parts = [p for p in [address, feeder_code, feeder_category] if p]
            location_description = ": ".join(location_parts) if location_parts else None
            
            reschedule_history = []
        
        # Status Calculation (common)
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now,
            api_status=api_status,
            is_cancelled=is_cancelled
        )

        # Location Geometry (common)
        geometry = None
        lat = order.get("lat")
        lng = order.get("lng")
        hull = order.get("hull")
        
        if hull and len(hull) >= 3:
            coordinates = [[point.get("lng"), point.get("lat")] for point in hull]
            # Ensure polygon is closed
            if coordinates[0] != coordinates[-1]:
                coordinates.append(coordinates[0])
            geometry = {"type": "Polygon", "coordinates": [coordinates]}
        elif lat is not None and lng is not None and lat != 0 and lng != 0:
            geometry = {"type": "Point", "coordinates": [lng, lat]}

        transformed_outages.append({
            "id": outage_id,
            "provider": "counties_energy",
            "category": "power_outage",
            "status": status,
            "schedule_type": schedule_type,
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": last_updated,
            "fetched_at": now.isoformat(),
            "cause": cause,
            "location_description": location_description,
            "location_geometry": geometry,
            "region": "auckland_waikato",
            "affected_customers": affected_customers,
            "information_url": "https://www.countiesenergy.co.nz/outages",
            "comments": comments,
            "latest_update": latest_update,
            "reschedule_history": reschedule_history
        })
        
    return transformed_outages

counties = Client(
    name="counties_energy",
    host="api.integration.countiesenergy.co.nz",
    endpoints={
        "current": {
            "path": "/user/v1.0/outages",
            "transformer": counties_transformer
        },
        "planned": {
            "path": "/user/v1.0/shutdowns",
            "transformer": lambda response: counties_transformer(response, is_planned=True)
        }
    }
)
