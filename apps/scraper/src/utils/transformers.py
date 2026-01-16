__all__ = [
    'calculate_status',
    'transform_nztm_to_wgs84',
    'parse_timestamp'
]

from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional, List, Dict, Any, Tuple
from pyproj import Transformer

@lru_cache(maxsize=1)
def get_coordinate_transformer() -> Transformer:
    """Returns a cached Transformer instance for NZTM to WGS84 conversion."""
    return Transformer.from_crs("EPSG:2193", "EPSG:4326", always_xy=True)

def calculate_status(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    now: Optional[datetime] = None,
    api_status: Optional[str] = None,
    is_restored: Optional[bool] = None,
    is_cancelled: Optional[bool] = None,
    has_alternate_date: bool = False
) -> str:
    """Calculates the standardized status of an outage based on timestamps and API-specific fields.
    
    Args:
        start_time: ISO 8601 start timestamp
        end_time: ISO 8601 end timestamp  
        now: Current datetime (defaults to UTC now if not provided)
        api_status: Provider-specific status string
        is_restored: Whether the provider indicates the outage is restored
        is_cancelled: Whether the provider indicates the outage is cancelled
        has_alternate_date: Whether the outage has been rescheduled
        
    Returns:
        One of: 'cancelled', 'restored', 'active', 'scheduled', 'postponed', 'unknown'
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    # Ensure now is timezone-aware
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    
    # Check explicit status flags first
    if is_cancelled:
        return "cancelled"
    
    if is_restored:
        return "restored"
    
    # Parse timestamps
    start_dt = None
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            pass
    
    end_dt = None
    if end_time:
        try:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            pass
    
    # Check if past end time
    if end_dt and end_dt < now:
        return "restored"
    
    # Check API-specific status strings
    if api_status:
        status_lower = api_status.lower()
        if status_lower in ['cancelled', 'canceled']:
            return "cancelled"
        if status_lower in ['complete', 'completed', 'closed', 'restored']:
            return "restored"
    
    # Calculate based on start time
    if start_dt:
        if start_dt <= now:
            return "active"
        else:
            return "postponed" if has_alternate_date else "scheduled"
    
    return "unknown"

def transform_nztm_to_wgs84(x: float, y: float) -> Tuple[float, float]:
    """Transforms coordinates from NZTM (EPSG:2193) to WGS84 (EPSG:4326).
    
    Args:
        x: Easting in NZTM
        y: Northing in NZTM
        
    Returns:
        Tuple of (longitude, latitude) in WGS84
    """
    transformer = get_coordinate_transformer()
    return transformer.transform(x, y)

def parse_timestamp(
    timestamp: Optional[str],
    format: Optional[str] = None,
    default_timezone: Optional[timezone] = None
) -> Optional[str]:
    """Parses a timestamp string and returns ISO 8601 format.
    
    Args:
        timestamp: The timestamp string to parse
        format: Optional strptime format string for non-ISO timestamps
        default_timezone: Timezone to apply if timestamp is naive
        
    Returns:
        ISO 8601 formatted timestamp string or None
    """
    if not timestamp or timestamp == "None":
        return None
    
    try:
        if format:
            dt = datetime.strptime(timestamp, format)
        else:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        # Apply default timezone if naive
        if dt.tzinfo is None and default_timezone:
            dt = dt.replace(tzinfo=default_timezone)
        
        return dt.isoformat()
    except (ValueError, AttributeError, TypeError):
        return None
