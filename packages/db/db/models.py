from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    TIMESTAMP,
    Index,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry

Base = declarative_base()

class PowerOutage(Base):
    """Defines the schema for the 'power_outages' table."""
    __tablename__ = 'power_outages'
    
    id = Column(String, primary_key=True)
    provider = Column(String, primary_key=True)
    start_time = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)
    
    category = Column(String)
    status = Column(String)
    schedule_type = Column(String)
    end_time = Column(TIMESTAMP(timezone=True))
    last_updated = Column(TIMESTAMP(timezone=True))
    fetched_at = Column(TIMESTAMP(timezone=True))
    cause = Column(Text)
    location_description = Column(Text)
    location_geometry = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
    region = Column(Text)
    affected_customers = Column(Integer)
    information_url = Column(String)
    comments = Column(Text)
    latest_update = Column(Text)
    reschedule_history = Column(JSONB)
    
    __table_args__ = (
        Index('ix_power_outages_status', 'status'),
        Index('ix_power_outages_region', 'region'),
        Index('ix_power_outages_provider', 'provider'),
        Index('ix_power_outages_status_start', 'status', 'start_time'),
    )

class RoadEvent(Base):
    """Defines the schema for the 'road_events' table."""
    __tablename__ = 'road_events'

    id = Column(String, primary_key=True)
    provider = Column(String, primary_key=True)
    start_time = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False)

    category = Column(String)
    status = Column(String)
    event_type = Column(String)
    schedule_type = Column(String)
    end_time = Column(TIMESTAMP(timezone=True))
    last_updated = Column(TIMESTAMP(timezone=True))
    fetched_at = Column(TIMESTAMP(timezone=True))
    description = Column(Text)
    comments = Column(Text)
    impact = Column(String)
    location_description = Column(Text)
    location_geometry = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)
    detour_description = Column(Text)
    expected_resolution = Column(String)
    region = Column(JSONB)
    
    __table_args__ = (
        Index('ix_road_events_status', 'status'),
        Index('ix_road_events_provider', 'provider'),
        Index('ix_road_events_status_start', 'status', 'start_time'),
    )
