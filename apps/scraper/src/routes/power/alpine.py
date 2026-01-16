# South Canterbury

__all__ = ["alpine", "alpine_transformer"]

from datetime import datetime, timezone

from src.utils import Client
from src.utils.transformers import calculate_status, transform_nztm_to_wgs84

def alpine_transformer(response):
    """Transforms raw Alpine Energy API response into our standardised outage format."""
    
    raw_data = response.json()
    transformed_outages = []
    now = datetime.now(timezone.utc)

    for feature in raw_data.get("features", []):
        attrs = feature.get("attributes", {})
        geom = feature.get("geometry", {})

        # Convert timestamps from milliseconds to ISO 8601 strings
        start_time_ms = attrs.get("EST_Start_Date")
        end_time_ms = attrs.get("ESTEnd_Date")
        alt_start_time_ms = attrs.get("Est_Alt_Start_Date")
        last_updated_ms = attrs.get("TimeStamp")

        start_time = datetime.fromtimestamp(start_time_ms / 1000, tz=timezone.utc).isoformat() if start_time_ms else None
        end_time = datetime.fromtimestamp(end_time_ms / 1000, tz=timezone.utc).isoformat() if end_time_ms else None
        alt_start_time = datetime.fromtimestamp(alt_start_time_ms / 1000, tz=timezone.utc).isoformat() if alt_start_time_ms else None
        last_updated = datetime.fromtimestamp(last_updated_ms / 1000, tz=timezone.utc).isoformat() if last_updated_ms else None

        # Status Calculation using utility
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now,
            has_alternate_date=bool(alt_start_time)
        )

        # Location Geometry
        geometry = None
        if (x := geom.get("x")) and (y := geom.get("y")):
            lon, lat = transform_nztm_to_wgs84(x, y)
            geometry = {"type": "Point", "coordinates": [lon, lat]}

        # Reschedule History
        reschedule_history = []
        if alt_start_time and start_time != alt_start_time:
            reschedule_history.append({
                "original_start_time": start_time,
                "new_start_time": alt_start_time,
                "reason": "Rescheduled to alternate date."
            })

        transformed_outages.append({
            "id": attrs.get("UniqueID"),
            "provider": "alpine_energy",
            "category": "power_outage",
            "status": status,
            "schedule_type": "planned",
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": last_updated,
            "fetched_at": now.isoformat(),
            "cause": attrs.get("RegulatoryReason"),
            "location_description": f"{attrs.get('Town', '')}: {attrs.get('Affected_Areas', '')}",
            "location_geometry": geometry,
            "region": "canterbury",
            "affected_customers": None,
            "information_url": "https://www.alpineenergy.co.nz/customers/outages/",
            "comments": attrs.get("Alpine_Reason"),
            "latest_update": attrs.get("Alpine_Reason"),
            "reschedule_history": reschedule_history
        })
        
    return transformed_outages

alpine = Client(
    name="alpine_energy",
    host="services7.arcgis.com/JnfgtYmPIMDJpRxm/arcgis/rest/services/Public_Outages",
    endpoints={
        # TODO: find unplanned outages endpoint
        "planned": "/FeatureServer/0/query?where=1=1&outFields=*&returnGeometry=true&f=json"
    },
    default_transformer=alpine_transformer
)
