"""Configuration for the scraper."""

import os

# Scraper settings
MAX_CONCURRENT_BROWSERS = 3
MAX_CONCURRENT_REQUESTS = 10
REQUEST_TIMEOUT = 15  # seconds
SCROLL_PAUSE_TIME = 1.5  # seconds between scrolls on Google Maps
MAX_SCROLLS = 15  # max scrolls to load more results

# POS systems to detect
POS_SYSTEMS = [
    "square",
    "toast",
    "clover",
    "lightspeed",
    "aloha",
    "micros",
    "revel",
    "shopkeep",
    "vend",
    "shopify pos",
    "touchbistro",
    "upserve",
    "cake pos",
    "harbortouch",
    "pos system",
    "point of sale",
    "ncr aloha",
    "oracle micros",
    "breadcrumb",
    "lavu",
    "talech",
    "epos",
    "epos now",
    "sapaad",
    "loyverse",
    "erply",
    "hike pos",
    "bindo",
    "kounta",
    "imonggo",
    "miva",
    "helcim",
    "paypal here",
    "sumup",
    "zettle",
    "gofrugal",
    "marg erp",
    "busy software",
    "tally",
]

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
