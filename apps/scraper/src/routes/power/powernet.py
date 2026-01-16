# Electricity Invercargill: Invercargill City and the Bluff township area
# OtagoNet: East and South Otago

__all__ = ["powernet_unplanned", "powernet_planned", "powernet_transformer"]

import json
from datetime import datetime, timezone, timedelta

from src.utils import Client
from src.utils.transformers import calculate_status

def powernet_transformer(response):
    """Transforms raw PowerNet API response into our standardised outage format."""
    
    try:
        raw_data = response.json()
    except json.JSONDecodeError:
        if isinstance(response.text, str):
             try:
                 raw_data = json.loads(response.text)
             except:
                 return []
        else:
            return []

    if isinstance(raw_data, str):
        try:
            raw_data = json.loads(raw_data)
        except:
            pass

    if not isinstance(raw_data, list):
        return []

    transformed_outages = []
    now = datetime.now(timezone.utc)
    local_tz = timezone(timedelta(hours=13)) # NZ Daylight Time assumption

    for outage in raw_data:
        is_planned = "Web_Pin_Id" in outage
        
        if is_planned:
            start_time = outage.get("Web_OffDateTime")
            end_time = outage.get("Web_OnDateTime")
            
            if start_time:
                try:
                    start_dt = datetime.fromisoformat(start_time)
                    if start_dt.tzinfo is None:
                        start_dt = start_dt.replace(tzinfo=local_tz)
                    start_time = start_dt.isoformat()
                except ValueError:
                    pass
            
            if end_time:
                try:
                    end_dt = datetime.fromisoformat(end_time)
                    if end_dt.tzinfo is None:
                        end_dt = end_dt.replace(tzinfo=local_tz)
                    end_time = end_dt.isoformat()
                except ValueError:
                    pass

            status = calculate_status(
                start_time=start_time,
                end_time=end_time,
                now=now,
                api_status=outage.get("Web_Status"),
                is_cancelled=outage.get("Web_CancelFlg") == 1 or outage.get("Web_Status") == "Cancelled"
            )

            outage_id = str(outage.get("Web_Pin_Id"))
            location_desc = f"Network: {outage.get('Web_Network')}"
            geometry = None
            cause = outage.get("Web_Purpose")
            comments = outage.get("Web_Pub_Type")
            
        else:
            start_str = outage.get("StartTime") or outage.get("InteractionDateTime")
            end_str = outage.get("ETR")
            
            start_time = None
            if start_str:
                try:
                    dt = datetime.strptime(start_str, "%d %b %Y %I:%M %p")
                    dt = dt.replace(tzinfo=local_tz)
                    start_time = dt.isoformat()
                except ValueError:
                    pass
            
            end_time = None
            if end_str:
                try:
                    dt = datetime.strptime(end_str, "%d %b %Y %I:%M %p")
                    dt = dt.replace(tzinfo=local_tz)
                    end_time = dt.isoformat()
                except ValueError:
                    pass

            status = calculate_status(
                start_time=start_time,
                end_time=end_time,
                now=now,
                api_status=outage.get("Status")
            )

            outage_id = str(outage.get("InteractionId"))
            location_desc = outage.get("Suburbs") or outage.get("Suburb") or outage.get("FeederZoneSublist")
            
            geometry = None
            if (lat := outage.get("Latitude")) and (lon := outage.get("Longitude")):
                geometry = {
                    "type": "Point",
                    "coordinates": [lon, lat]
                }
            
            cause = outage.get("TypeOfFault")
            comments = outage.get("Comments")

        transformed_outages.append({
            "id": outage_id,
            "provider": "powernet",
            "category": "power_outage",
            "status": status,
            "schedule_type": "planned" if is_planned else "unplanned",
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": None,
            "fetched_at": now.isoformat(),
            "cause": cause,
            "location_description": location_desc,
            "location_geometry": geometry,
            "region": "southland_otago",
            "affected_customers": outage.get("Web_Num_ICPs") if is_planned else None,
            "information_url": "https://powernet.co.nz/outages",
            "comments": comments,
            "latest_update": None,
            "reschedule_history": []
        })

    return transformed_outages

powernet_unplanned = Client(
    name="powernet_unplanned",
    host="powernet.co.nz",
    endpoints={
        "current": {
            "path": "/wp-admin/admin-ajax.php",
            "method": "POST",
             "default_headers": {"Content-Type": "application/x-www-form-urlencoded"} 
        }
    },
    default_transformer=powernet_transformer
)

powernet_planned = Client(
    name="powernet_planned",
    host="outage-api.powernet.co.nz",
    endpoints={
        "planned": "/api/outages"
    },
    default_transformer=powernet_transformer
)

