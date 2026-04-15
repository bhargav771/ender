"""Export scraping results to CSV and JSON."""

import csv
import json
import io
import os
from datetime import datetime

from app.models import LeadResult
from app.config import OUTPUT_DIR


EXPORT_FIELDS = [
    "date", "search_query", "category", "zipcode", "city", "state", "country",
    "name", "address", "phone", "website",
    "facebook_link", "instagram_link", "twitter_link", "linkedin_link",
    "google_maps_email", "all_website_emails", "website_email",
    "facebook_email", "instagram_email", "final_email",
    "comparing_emails", "email_source",
    "maps_url", "place_id", "closure_status", "status",
    "rating", "reviews_count", "price_range", "cuisine_types", "opening_hours",
    "has_pos", "pos_system", "pos_details",
]


def export_to_csv(results: list[LeadResult], filename: str = "") -> str:
    """Export results to CSV. Returns the CSV content as a string."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPORT_FIELDS)
    writer.writeheader()
    for lead in results:
        row = {field: getattr(lead, field, "") for field in EXPORT_FIELDS}
        writer.writerow(row)
    return output.getvalue()


def export_to_json(results: list[LeadResult]) -> str:
    """Export results to JSON. Returns the JSON content as a string."""
    data = []
    for lead in results:
        row = {field: getattr(lead, field, "") for field in EXPORT_FIELDS}
        data.append(row)
    return json.dumps(data, indent=2)


def save_to_file(results: list[LeadResult], fmt: str = "csv") -> str:
    """Save results to a file in the output directory. Returns the file path."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if fmt == "csv":
        filename = f"leads_{timestamp}.csv"
        filepath = os.path.join(OUTPUT_DIR, filename)
        content = export_to_csv(results)
    else:
        filename = f"leads_{timestamp}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)
        content = export_to_json(results)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    return filepath
