# Eastern Bay of Plenty

__all__ = ["horizon", "horizon_transformer"]

from datetime import datetime, timezone
import xml.etree.ElementTree as etree

from src.utils import Client
from src.utils.transformers import calculate_status, parse_timestamp


def horizon_transformer(response):
    """Transforms raw Horizon Networks XML response into our standardised outage format."""
    
    xml_content = response.text
    transformed_outages = []
    now = datetime.now(timezone.utc)
    
    try:
        root = etree.fromstring(xml_content.encode('utf-8'))
    except etree.ParseError:
        return transformed_outages
    
    # Find all OMSCASES elements
    cases = root.findall('.//OMSCASES')
    
    for case in cases:
        # Extract basic fields
        serial = case.findtext('SERIAL', '')
        desc = case.findtext('DESC', '')
        notes = case.findtext('NOTES', '')
        planned = case.findtext('PLANNED', '0')
        case_stat = case.findtext('CASESTAT', '')
        work_stat = case.findtext('WORKSTAT', '')
        avg_lat = case.findtext('AVGLAT', '')
        avg_long = case.findtext('AVGLONG', '')
        out_time = case.findtext('OUTTIME', '')
        init_cust = case.findtext('INITCUST', '')
        cur_cust = case.findtext('CURCUST', '')
        restore_time = case.findtext('RESTORETIM', '')
        rest_range = case.findtext('RESTRANGE', '')
        desc_cause = case.findtext('DESC_CAUSE', '')
        coord_count = case.findtext('COORDCOUNT', '')
        coord_list = case.findtext('COORDLIST', '')
        public_msg = case.findtext('PUBLICMSG', '')
        outage_type = case.findtext('TYPE', '')
        
        # Parse timestamps (format: "10-11-2025 10:01 am")
        start_time = parse_timestamp(
            out_time,
            format="%d-%m-%Y %I:%M %p",
            default_timezone=timezone.utc
        ) if out_time else None
        
        end_time = parse_timestamp(
            restore_time,
            format="%d-%m-%Y %I:%M %p",
            default_timezone=timezone.utc
        ) if restore_time else None
        
        # Determine schedule type
        is_planned = planned == '1'
        schedule_type = "planned" if is_planned else "unplanned"
        
        # Status calculation
        # CASESTAT values: 2 = active outage
        is_restored = case_stat in ['3', '4']  # Common completion status codes
        
        status = calculate_status(
            start_time=start_time,
            end_time=end_time,
            now=now,
            is_restored=is_restored
        )
        
        # Location geometry
        geometry = None
        if avg_lat and avg_long:
            try:
                lat = float(avg_lat)
                lon = float(avg_long)
                if lat != 0 and lon != 0:
                    # Check if we have a polygon from COORDLIST
                    if coord_list and int(coord_count or 0) > 2:
                        coords = coord_list.split(',')
                        if len(coords) >= 4:  # At least 2 points (lat,lon pairs)
                            polygon_coords = []
                            for i in range(0, len(coords) - 1, 2):
                                try:
                                    point_lat = float(coords[i])
                                    point_lon = float(coords[i + 1])
                                    polygon_coords.append([point_lon, point_lat])
                                except (ValueError, IndexError):
                                    continue
                            
                            if len(polygon_coords) >= 3:
                                # Ensure polygon is closed
                                if polygon_coords[0] != polygon_coords[-1]:
                                    polygon_coords.append(polygon_coords[0])
                                geometry = {
                                    "type": "Polygon",
                                    "coordinates": [polygon_coords]
                                }
                    
                    # Fall back to point if no valid polygon
                    if not geometry:
                        geometry = {"type": "Point", "coordinates": [lon, lat]}
            except (ValueError, TypeError):
                pass
        
        # Affected customers
        affected_customers = None
        if cur_cust:
            try:
                affected_customers = int(cur_cust)
            except ValueError:
                pass
        
        # Build location description
        location_parts = []
        if desc:
            location_parts.append(desc)
        if notes:
            location_parts.append(notes)
        location_description = ': '.join(filter(None, location_parts)) or None
        
        # Comments and updates
        comments = public_msg if public_msg else None
        latest_update = public_msg if public_msg else None
        if rest_range:
            latest_update = f"{latest_update or ''} Expected restoration: {rest_range}".strip()
        
        transformed_outages.append({
            "id": serial,
            "provider": "horizon",
            "category": "power_outage",
            "status": status,
            "schedule_type": schedule_type,
            "start_time": start_time,
            "end_time": end_time,
            "last_updated": end_time or start_time or now.isoformat(),
            "fetched_at": now.isoformat(),
            "cause": desc_cause if desc_cause and desc_cause != "Unknown" else None,
            "location_description": location_description,
            "location_geometry": geometry,
            "region": "bay_of_plenty",
            "affected_customers": affected_customers,
            "information_url": "https://outages.horizonnetworks.nz/",
            "comments": comments,
            "latest_update": latest_update,
            "reschedule_history": []
        })
    
    return transformed_outages


horizon = Client(
    name="horizon",
    host="outages.horizonnetworks.nz",
    endpoints={
        "current": {
            "path": "/Outages/Home/UpdatePushpin",
            "transformer": horizon_transformer,
            "method": "POST"
        },
        "planned": {
            "path": "/Outages/Home/UpdatePushpin?M=s",
            "transformer": horizon_transformer,
            "method": "POST"
        }
    }
)
