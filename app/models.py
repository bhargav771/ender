"""Data models for the restaurant leads scraper."""

from typing import Optional
from pydantic import BaseModel, Field


class ScrapeRequest(BaseModel):
    """Request model for starting a scrape job."""

    search_terms: list[str]  # one per line from UI
    zip_codes: list[str]  # format: "zipcode city state country"
    max_results_per_search: int = Field(default=20, ge=1, le=100)


class LeadResult(BaseModel):
    """Single lead result from scraping."""

    date: str = ""
    search_query: str = ""
    category: str = ""
    zipcode: str = ""
    city: str = ""
    state: str = ""
    country: str = ""
    name: str = ""
    address: str = ""
    phone: str = ""
    website: str = ""

    # Social media links
    facebook_link: str = ""
    instagram_link: str = ""
    twitter_link: str = ""
    linkedin_link: str = ""

    # Emails
    google_maps_email: str = ""
    all_website_emails: str = ""
    website_email: str = ""
    facebook_email: str = ""
    instagram_email: str = ""
    final_email: str = ""
    comparing_emails: str = ""
    email_source: str = ""

    # Google Maps data
    maps_url: str = ""
    place_id: str = ""
    closure_status: str = ""
    status: str = ""
    rating: str = ""
    reviews_count: str = ""
    price_range: str = ""
    cuisine_types: str = ""
    opening_hours: str = ""

    # POS Detection
    has_pos: str = ""
    pos_system: str = ""
    pos_details: str = ""

    # Delivery & Storefront
    delivery_services: str = ""
    website_type: str = ""
    storefront: str = ""


class ScrapeJob(BaseModel):
    """Represents a scraping job with progress tracking."""

    job_id: str = ""
    status: str = "pending"  # pending, running, completed, failed
    total: int = 0
    completed: int = 0
    results: list[LeadResult] = []
    errors: list[str] = []
