-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create power_outages table
CREATE TABLE IF NOT EXISTS power_outages (
    id VARCHAR NOT NULL,
    provider VARCHAR NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR,
    status VARCHAR,
    schedule_type VARCHAR,
    end_time TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE,
    cause TEXT,
    location_description TEXT,
    location_geometry geometry(GEOMETRY, 4326),
    region TEXT,
    affected_customers INTEGER,
    information_url VARCHAR,
    comments TEXT,
    latest_update TEXT,
    reschedule_history JSONB,
    PRIMARY KEY (id, provider, start_time)
);

-- Create road_events table
CREATE TABLE IF NOT EXISTS road_events (
    id VARCHAR NOT NULL,
    provider VARCHAR NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    category VARCHAR,
    status VARCHAR,
    event_type VARCHAR,
    schedule_type VARCHAR,
    end_time TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    comments TEXT,
    impact VARCHAR,
    location_description TEXT,
    location_geometry geometry(GEOMETRY, 4326),
    detour_description TEXT,
    expected_resolution VARCHAR,
    region JSONB,
    PRIMARY KEY (id, provider, start_time)
);

-- Create indexes for power_outages
CREATE INDEX IF NOT EXISTS ix_power_outages_status ON power_outages (status);
CREATE INDEX IF NOT EXISTS ix_power_outages_region ON power_outages (region);
CREATE INDEX IF NOT EXISTS ix_power_outages_provider ON power_outages (provider);
CREATE INDEX IF NOT EXISTS ix_power_outages_status_start ON power_outages (status, start_time);

-- Create indexes for road_events
CREATE INDEX IF NOT EXISTS ix_road_events_status ON road_events (status);
CREATE INDEX IF NOT EXISTS ix_road_events_provider ON road_events (provider);
CREATE INDEX IF NOT EXISTS ix_road_events_status_start ON road_events (status, start_time);

-- Convert to TimescaleDB hypertables
SELECT create_hypertable('power_outages', 'start_time', if_not_exists => TRUE);
SELECT create_hypertable('road_events', 'start_time', if_not_exists => TRUE);
