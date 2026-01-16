import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from pathlib import Path

# Load .env from root if it exists
# Resolve path relative to this file: .../packages/db/db/database.py
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=env_path)

def get_database_url():
    DB_USER = os.getenv("POSTGRES_USER", os.getenv("DB_USER", "user"))
    DB_PASS = os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "password"))
    DB_NAME = os.getenv("POSTGRES_DB", os.getenv("DB_NAME", "outages"))
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    
    return f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def create_db_engine(url=None):
    if url is None:
        url = get_database_url()
    return create_engine(url)

def create_session_factory(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Default shared instances
engine = create_db_engine()
SessionLocal = create_session_factory(engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
