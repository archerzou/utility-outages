# Tairāwhiti and Wairoa

__all__ = ["firstlight", "firstlight_transformer"]

import re
from datetime import datetime, timezone, timedelta
from lxml import html

from src.utils import Client
from src.utils.transformers import calculate_status, parse_timestamp

def parse_date_time(date_str, time_str):
    """Parse Firstlight's date and time format into ISO 8601 timestamp.
    
    Args:
        date_str: Date string like "10th Nov 2025 (Mon)"
        time_str: Time string like "8:00 AM - 5:00 PM"
    
    Returns:
        Tuple of (start_time, end_time) in ISO 8601 format
    """
    if not date_str or not time_str:
        return None, None
    
    # Extract date components: "10th Nov 2025 (Mon)" -> "10 Nov 2025"
    date_match = re.search(r'(\d+)[a-z]{2}\s+(\w+)\s+(\d{4})', date_str)
    if not date_match:
        return None, None
    
    day, month, year = date_match.groups()
    date_base = f"{day} {month} {year}"
    
    # Parse time range: "8:00 AM - 5:00 PM"
    time_match = re.search(r'(\d+:\d+\s+[AP]M)\s*-\s*(\d+:\d+\s+[AP]M)', time_str)
    if not time_match:
        return None, None
    
    start_time_str, end_time_str = time_match.groups()
    
    # New Zealand timezone (NZDT is UTC+13)
    nz_tz = timezone(timedelta(hours=13))
    
    try:
        start_dt = datetime.strptime(f"{date_base} {start_time_str}", "%d %b %Y %I:%M %p")
        start_dt = start_dt.replace(tzinfo=nz_tz)
        
        end_dt = datetime.strptime(f"{date_base} {end_time_str}", "%d %b %Y %I:%M %p")
        end_dt = end_dt.replace(tzinfo=nz_tz)
        
        return start_dt.isoformat(), end_dt.isoformat()
    except ValueError:
        return None, None

def parse_notice_status(notice_text):
    """Parse the notice field to determine if outage is cancelled or rescheduled.
    
    Returns:
        Tuple of (is_cancelled, has_alternate_date)
    """
    if not notice_text:
        return False, False
    
    notice_lower = notice_text.lower()
    is_cancelled = 'cancelled' in notice_lower and 'not using alt' in notice_lower
    has_alternate = 'alternate' in notice_lower or 'moved to alternate' in notice_lower
    
    return is_cancelled, has_alternate

def firstlight_transformer(response):
    """Transforms raw Firstlight HTML response into our standardised outage format."""
    
    raw_html = response.text
    tree = html.fromstring(raw_html)
    transformed_outages = []
    now = datetime.now(timezone.utc)
    
    # Extract last updated timestamp
    last_updated_elem = tree.xpath('//span[@id="OutageLastUpdated"]/text()')
    last_updated_str = last_updated_elem[0] if last_updated_elem else None
    page_last_updated = None
    if last_updated_str:
        # Parse "Last updated: 10 November 2025 - 10:06 AM"
        match = re.search(r'Last updated:\s*(\d+\s+\w+\s+\d{4})\s*-\s*(\d+:\d+\s+[AP]M)', last_updated_str)
        if match:
            date_part, time_part = match.groups()
            try:
                nz_tz = timezone(timedelta(hours=13))
                dt = datetime.strptime(f"{date_part} {time_part}", "%d %B %Y %I:%M %p")
                dt = dt.replace(tzinfo=nz_tz)
                page_last_updated = dt.isoformat()
            except ValueError:
                pass
    
    # Find all accordion regions
    accordion_items = tree.xpath('//div[@class="accordion-item"]')
    
    for item in accordion_items:
        # Extract region name
        region_header = item.xpath('.//span[@class="region-header"]/text()')
        region = region_header[0].strip() if region_header else None
        
        # Find all outage rows in this region
        rows = item.xpath('.//tr[@class="outage-table-row"]')
        
        for row in rows:
            cells = row.xpath('./td | ./th')
            
            if len(cells) < 9:
                continue
            
            # Extract cell data
            region_cell = cells[0].text_content().strip() if cells[0].text_content() else region
            date_str = cells[1].text_content().strip()
            ref_id = cells[2].text_content().strip()
            area_affected = cells[3].text_content().strip()
            duration = cells[4].text_content().strip()
            reason = cells[5].text_content().strip()
            customers_str = cells[6].text_content().strip()
            alternate_date_str = cells[7].text_content().strip()
            notice = cells[8].text_content().strip()
            
            # Parse timestamps
            start_time, end_time = parse_date_time(date_str, duration)
            alternate_start_time, alternate_end_time = parse_date_time(alternate_date_str, duration) if alternate_date_str else (None, None)
            
            # Parse affected customers
            affected_customers = None
            if customers_str and customers_str.isdigit():
                affected_customers = int(customers_str)
            
            # Determine status
            is_cancelled, has_alternate = parse_notice_status(notice)
            
            status = calculate_status(
                start_time=start_time,
                end_time=end_time,
                now=now,
                is_cancelled=is_cancelled,
                has_alternate_date=has_alternate
            )
            
            # Build reschedule history
            reschedule_history = []
            if alternate_start_time and start_time != alternate_start_time:
                reschedule_history.append({
                    "original_start_time": start_time,
                    "new_start_time": alternate_start_time,
                    "reason": f"Rescheduled: {notice}"
                })
            
            # Map region to standardized format
            region_map = {
                "East Coast": "gisborne",
                "Gisborne": "gisborne",
                "Wairoa": "hawkes_bay"
            }
            standardized_region = region_map.get(region_cell or "", "gisborne")
            
            transformed_outages.append({
                "id": ref_id,
                "provider": "firstlight_network",
                "category": "power_outage",
                "status": status,
                "schedule_type": "planned",
                "start_time": start_time,
                "end_time": end_time,
                "last_updated": page_last_updated,
                "fetched_at": now.isoformat(),
                "cause": reason,
                "location_description": area_affected,
                "location_geometry": None,  # No coordinates provided
                "region": standardized_region,
                "affected_customers": affected_customers,
                "information_url": "https://firstlightnetwork.co.nz/tell-me-about/outages",
                "comments": notice,
                "latest_update": notice,
                "reschedule_history": reschedule_history
            })
    
    return transformed_outages

firstlight = Client(
    name="firstlight_network",
    host="firstlightnetwork.co.nz",
    endpoints={
        "planned": "/tell-me-about/outages"
    },
    default_transformer=firstlight_transformer
)
