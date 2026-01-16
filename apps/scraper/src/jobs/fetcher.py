import asyncio
import logging
import argparse
from shapely.geometry import shape
from geoalchemy2.shape import from_shape

from src.routes.power import POWER
from src.routes.roads import nzta
from src.database import (
    SessionLocal,
    PowerOutage,
    RoadEvent,
    PowerOutage,
    RoadEvent,
    create_tables,
    drop_tables,
    upsert_data,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fetcher.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_geometry_from_json(geom_data):
    """Converts a GeoJSON dictionary to a Shapely object."""
    if not geom_data or 'type' not in geom_data or 'coordinates' not in geom_data:
        return None
    try:
        return shape(geom_data)
    except (TypeError, ValueError):
        return None

async def fetch_power():
    """Fetches and upserts all power outage data."""
    logger.info("Fetching Power Outage Data...")
    tasks = [client.dispatch(endpoint) for client in POWER async for endpoint in client]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_power_events = []
    for (client_name, endpoint), res in zip([(client.name, ep) for client in POWER async for ep in client], results):
        if isinstance(res, Exception):
            logger.error(f"Failed to fetch power outage {client_name}:{endpoint}: {res}")
        elif res:
            all_power_events.extend(res)

    logger.info(f"Fetched {len(all_power_events)} total power events.")
    
    power_outage_columns = {c.name for c in PowerOutage.__table__.columns}
    
    processed_data = [
        {key: value for key, value in item.items() if key in power_outage_columns}
        | {'location_geometry': (from_shape(geom, srid=4326) 
                                  if (geom := get_geometry_from_json(item.get('location_geometry'))) 
                                  else None)}
        for item in all_power_events if item.get('start_time')
    ]

    if processed_data:
        with SessionLocal() as session:
            rows_affected = upsert_data(session, PowerOutage, processed_data, ['id', 'provider', 'start_time'])
            session.commit()
        logger.info(f"Database update complete. {rows_affected} power outage rows processed (upserted).")
    else:
        logger.info("No power outage data to update.")

async def fetch_roads():
    """Fetches and upserts all road event data."""
    logger.info("Fetching Road Event Data...")
    tasks = [nzta.dispatch(endpoint) async for endpoint in nzta]
    endpoints = [ep async for ep in nzta]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_road_events = []
    for endpoint, res in zip(endpoints, results):
        if isinstance(res, Exception):
            logger.error(f"Failed to fetch road event {endpoint}: {res}")
        elif res:
            all_road_events.extend(res)
    
    logger.info(f"Fetched {len(all_road_events)} total road events.")

    road_event_columns = {c.name for c in RoadEvent.__table__.columns}
        
    processed_data = [
        {key: value for key, value in item.items() if key in road_event_columns}
        | {'location_geometry': (from_shape(geom, srid=4326) 
                                  if (geom := get_geometry_from_json(item.get('location_geometry'))) 
                                  else None)}
        for item in all_road_events if item.get('start_time')
    ]
        
    if processed_data:
        with SessionLocal() as session:
            rows_affected = upsert_data(session, RoadEvent, processed_data, ['id', 'provider', 'start_time'])
            session.commit()
        logger.info(f"Database update complete. {rows_affected} road event rows processed (upserted).")
    else:
        logger.info("No road event data to update.")

async def run_once():
    """Runs the fetching pipeline once."""
    await asyncio.gather(
        fetch_power(),
        fetch_roads()
    )

async def main():
    """Initialises the DB and runs the data fetching pipelines hourly."""
    parser = argparse.ArgumentParser(description="Run the scraper job.")
    parser.add_argument('--clear-db', action='store_true', help="Clear the database before starting.")
    args = parser.parse_args()

    logger.info("Starting fetcher job...")
    
    if args.clear_db:
        try:
            drop_tables()
        except Exception as e:
            logger.error(f"Failed to drop tables: {e}")

    try:
        create_tables()
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")
        # We might want to continue anyway if tables exist, but create_tables handles that mostly.

    while True:
        try:
            logger.info("Starting data fetch cycle...")
            await run_once()
            logger.info("Fetch cycle complete. Sleeping for 1 hour.")
        except Exception as e:
            logger.exception(f"Error during fetch cycle: {e}")
        
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
