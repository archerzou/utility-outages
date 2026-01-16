from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from .session import engine
from db.models import Base

def drop_tables():
    """Drops all tables in the database."""
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped.")

def create_tables():
    """Creates all tables and converts them to TimescaleDB hypertables."""
    print("Creating database tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    
    # Enable TimescaleDB on both tables within a single transaction
    with engine.connect() as connection:
        try:
            print("Ensuring 'power_outages' is a TimescaleDB hypertable...")
            connection.execute(text("SELECT create_hypertable('power_outages', 'start_time', if_not_exists => TRUE);"))
            
            print("Ensuring 'road_events' is a TimescaleDB hypertable...")
            connection.execute(text("SELECT create_hypertable('road_events', 'start_time', if_not_exists => TRUE);"))
            
            connection.commit()
            print("Hypertables are set up successfully.")
        except Exception as e:
            # Catch errors if tables already exist or if there's a schema issue
            print(f"Could not create hypertable: {e}")
            connection.rollback()
            
def upsert_data(session, model, data, index_elements):
    """Performs a bulk 'upsert' (insert on conflict update)."""
    if not data:
        return 0
    
    stmt = pg_insert(model).values(data)
    # Exclude primary key columns from the update statement
    update_cols = {col.name: col for col in stmt.excluded if not col.primary_key}
    
    if not update_cols:
        # If all columns are part of the primary key, do nothing on conflict
        stmt = stmt.on_conflict_do_nothing(index_elements=index_elements)
    else:
        # Otherwise, update the non-primary-key columns
        stmt = stmt.on_conflict_do_update(index_elements=index_elements, set_=update_cols)
        
    result = session.execute(stmt)
    return result.rowcount
