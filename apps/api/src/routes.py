import json
from robyn import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from database import SessionLocal
from db.models import PowerOutage, RoadEvent
from schemas import OutageStats

from datetime import datetime

# Default and maximum limits for pagination
DEFAULT_LIMIT = 1000
MAX_LIMIT = 5000

def get_outages(types: str = None, status: str = None, region: str = None, provider: str = None, start_time: str = None, end_time: str = None, limit: int = None, offset: int = None):
    # Set defaults if None provided
    if types is None: types = "power,road"
    if status is None: status = "Active"
    if limit is None: limit = DEFAULT_LIMIT
    if offset is None: offset = 0
    
    # Clamp limit to prevent excessive data fetching
    limit = min(max(1, limit), MAX_LIMIT)
    offset = max(0, offset)

    print(f"Fetching outages with params: types={types}, status={status}, region={region}, provider={provider}, start={start_time}, end={end_time}, limit={limit}, offset={offset}")
    session = SessionLocal()
    
    types_list = types.split(",")
    # status, region passed directly
    # start_time, end_time passed directly

    outages = []
    
    try:
        from_time = datetime.fromisoformat(start_time.replace("Z", "+00:00")) if start_time else None
        to_time = datetime.fromisoformat(end_time.replace("Z", "+00:00")) if end_time else None
    except ValueError as e:
        print(f"Invalid date format: {e}")
        return {"error": "Invalid date format. Use ISO8601 (e.g., 2023-10-01T00:00:00Z)"}

    try:
        # Fetch power outages if requested
        if "power" in types_list:
            print("Executing power outage query...")
            power_stmt = select(
                PowerOutage,
                func.ST_AsGeoJSON(PowerOutage.location_geometry).label('geometry_json')
            )
            
            if status.lower() != "all":
                power_stmt = power_stmt.where(PowerOutage.status.ilike(status))
            if from_time:
                power_stmt = power_stmt.where(PowerOutage.start_time >= from_time)
            if to_time:
                power_stmt = power_stmt.where(PowerOutage.start_time <= to_time)
            if region:
                power_stmt = power_stmt.where(PowerOutage.region == region)
            if provider:
                power_stmt = power_stmt.where(PowerOutage.provider.ilike(provider))
            
            # Add ordering and pagination
            power_stmt = power_stmt.order_by(PowerOutage.start_time.desc()).limit(limit).offset(offset)
                
            power_results = session.execute(power_stmt).all()
            print(f"Found {len(power_results)} power outages.")
            
            for row in power_results:
                outage = row[0]
                geom = json.loads(row.geometry_json) if row.geometry_json else None
                outages.append({
                    "id": outage.id,
                    "provider": outage.provider,
                    "type": "power",
                    "start_time": outage.start_time.isoformat() if outage.start_time else None,
                    "end_time": outage.end_time.isoformat() if outage.end_time else None,
                    "fetched_at": outage.fetched_at.isoformat() if outage.fetched_at else None,
                    "last_updated": outage.last_updated.isoformat() if outage.last_updated else None,
                    "category": outage.category,
                    "status": outage.status,
                    "schedule_type": outage.schedule_type,
                    "cause": outage.cause,
                    "location": outage.location_description,
                    "region": outage.region,
                    "affected_customers": outage.affected_customers,
                    "information_url": outage.information_url,
                    "comments": outage.comments,
                    "latest_update": outage.latest_update,
                    "reschedule_history": outage.reschedule_history,
                    "geometry": geom
                })
            
        # Fetch road events if requested
        if "road" in types_list:
            print("Executing road event query...")
            road_stmt = select(
                RoadEvent,
                func.ST_AsGeoJSON(RoadEvent.location_geometry).label('geometry_json')
            )
            
            if status.lower() != "all":
                road_stmt = road_stmt.where(RoadEvent.status.ilike(status))
            if from_time:
                road_stmt = road_stmt.where(RoadEvent.start_time >= from_time)
            if to_time:
                road_stmt = road_stmt.where(RoadEvent.start_time <= to_time)
            if provider:
                road_stmt = road_stmt.where(RoadEvent.provider.ilike(provider))
            # RoadEvent region is JSONB in models, handling might differ but for now simple filter if string
            # if region: road_stmt = road_stmt.where(...)
            
            # Add ordering and pagination
            road_stmt = road_stmt.order_by(RoadEvent.start_time.desc()).limit(limit).offset(offset)
            
            road_results = session.execute(road_stmt).all()
            print(f"Found {len(road_results)} road events.")
            
            for row in road_results:
                event = row[0]
                geom = json.loads(row.geometry_json) if row.geometry_json else None
                outages.append({
                    "id": event.id,
                    "provider": event.provider,
                    "type": "road",
                    "start_time": event.start_time.isoformat() if event.start_time else None,
                    "end_time": event.end_time.isoformat() if event.end_time else None,
                    "fetched_at": event.fetched_at.isoformat() if event.fetched_at else None,
                    "last_updated": event.last_updated.isoformat() if event.last_updated else None,
                    "category": event.category,
                    "status": event.status,
                    "event_type": event.event_type,
                    "schedule_type": event.schedule_type,
                    "location": event.location_description,
                    "description": event.description,
                    "comments": event.comments,
                    "impact": event.impact,
                    "detour_description": event.detour_description,
                    "expected_resolution": event.expected_resolution,
                    "region": event.region,
                    "geometry": geom
                })
            
        return {"outages": outages}
    finally:
        session.close()

def get_stats():
    session = SessionLocal()
    try:
        # Power outage stats
        power_affected = session.execute(
            select(func.sum(PowerOutage.affected_customers))
            .where(PowerOutage.status.ilike('active'))
        ).scalar() or 0
        power_count = session.execute(
            select(func.count(PowerOutage.id))
            .where(PowerOutage.status.ilike('active'))
        ).scalar() or 0
        power_regions = session.execute(
            select(PowerOutage.region, func.count(PowerOutage.id))
            .where(PowerOutage.status.ilike('active'))
            .group_by(PowerOutage.region)
        ).all()
        
        # Road event stats
        road_count = session.execute(
            select(func.count(RoadEvent.id))
            .where(RoadEvent.status.ilike('active'))
        ).scalar() or 0
        # Road events don't have affected_customers
        
        return {
            "power": {
                "activeCount": power_count,
                "affectedCustomers": int(power_affected),
                "regions": {r[0]: r[1] for r in power_regions if r[0]}
            },
            "road": {
                "activeCount": road_count,
                "regions": {}  # Road event regions are JSONB, handled differently
            }
        }
    finally:
        session.close()

def get_providers():
    session = SessionLocal()
    try:
        power_providers = session.execute(select(PowerOutage.provider).distinct()).scalars().all()
        road_providers = session.execute(select(RoadEvent.provider).distinct()).scalars().all()
        
        return {
            "power": list(power_providers),
            "road": list(road_providers)
        }
    finally:
        session.close()

def get_regions():
    session = SessionLocal()
    try:
        power_regions = session.execute(select(PowerOutage.region).distinct()).scalars().all()
        # RoadEvent.region is JSONB, skip for now
        
        return {
            "power": [r for r in power_regions if r],  # Filter out None values
            "road": []  # Road event regions are JSONB, handled differently
        }
    finally:
        session.close()
