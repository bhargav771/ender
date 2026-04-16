"""POS system detection, delivery service detection, and website type analysis."""

import re
import ssl
import logging

import aiohttp
from bs4 import BeautifulSoup

from app.config import POS_SYSTEMS, REQUEST_TIMEOUT


def _create_ssl_context() -> ssl.SSLContext:
    """Create an SSL context that verifies certificates."""
    ctx = ssl.create_default_context()
    return ctx

logger = logging.getLogger(__name__)

# Delivery service indicators
DELIVERY_SERVICES = {
    "DoorDash": ["doordash", "door dash", "doordash.com"],
    "Uber Eats": ["uber eats", "ubereats", "ordering.uber.com", "ubereats.com"],
    "Grubhub": ["grubhub", "grub hub", "grubhub.com"],
    "Postmates": ["postmates", "postmates.com"],
    "ChowNow": ["chownow", "chownow.com"],
    "Seamless": ["seamless", "seamless.com"],
    "Caviar": ["caviar", "trycaviar.com"],
    "Instacart": ["instacart", "instacart.com"],
    "Drizly": ["drizly", "drizly.com"],
    "Minibar": ["minibardelivery", "minibar delivery"],
    "Wolt": ["wolt", "wolt.com"],
    "Zomato": ["zomato", "zomato.com"],
    "Swiggy": ["swiggy", "swiggy.co"],
}

# Website platform indicators
WEBSITE_PLATFORMS = {
    "Shopify": ["cdn.shopify.com", "myshopify.com", "shopify"],
    "WordPress": ["wp-content", "wp-includes", "wordpress"],
    "Wix": ["wixsite.com", "wix.com", "wixpress.com"],
    "Squarespace": ["squarespace.com", "sqsp.net"],
    "GoDaddy": ["godaddy.com", "secureserver.net"],
    "Weebly": ["weebly.com"],
    "BigCommerce": ["bigcommerce.com"],
    "WooCommerce": ["woocommerce", "wc-api"],
    "BentoBox": ["getbento.com", "bentobox"],
    "Custom": [],
}


def detect_delivery_services(html: str) -> list[str]:
    """Detect delivery service integrations from website HTML."""
    if not html:
        return []
    html_lower = html.lower()
    detected = []
    for service, indicators in DELIVERY_SERVICES.items():
        for indicator in indicators:
            if indicator in html_lower:
                detected.append(service)
                break
    return detected


def detect_website_type(html: str, url: str) -> str:
    """Detect what platform a website is built on."""
    if not html:
        return "Unknown"
    html_lower = html.lower()
    url_lower = url.lower()

    for platform, indicators in WEBSITE_PLATFORMS.items():
        for indicator in indicators:
            if indicator in html_lower or indicator in url_lower:
                return platform
    return "Custom"


def detect_storefront(html: str) -> str:
    """Detect if the website has an online storefront/ordering."""
    if not html:
        return "No"
    html_lower = html.lower()
    storefront_indicators = [
        "add to cart", "buy now", "shop now", "order online",
        "online ordering", "place order", "checkout",
        "shopping cart", "add-to-cart", "product-price",
    ]
    for indicator in storefront_indicators:
        if indicator in html_lower:
            return "Yes"
    return "No"


async def detect_pos_system(website_url: str) -> dict:
    """
    Detect POS system, delivery services, website type, and storefront.

    Returns dict with:
        - has_pos: bool
        - pos_system: str
        - pos_details: str
        - delivery_services: str
        - website_type: str
        - storefront: str
    """
    result = {
        "has_pos": False,
        "pos_system": "",
        "pos_details": "",
        "delivery_services": "",
        "website_type": "Unknown",
        "storefront": "No",
    }

    if not website_url:
        return result

    if not website_url.startswith("http"):
        website_url = "https://" + website_url

    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
        }
        connector = aiohttp.TCPConnector(ssl=_create_ssl_context())
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(
                website_url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                allow_redirects=True,
            ) as response:
                if response.status != 200:
                    return result
                html = await response.text(errors="replace")
    except Exception as e:
        logger.debug(f"Failed to fetch {website_url} for POS detection: {e}")
        return result

    if not html:
        return result

    html_lower = html.lower()
    soup = BeautifulSoup(html, "lxml")
    page_text = soup.get_text().lower()

    detected_systems = []

    # Check page content for POS system mentions
    for pos in POS_SYSTEMS:
        pos_lower = pos.lower()
        if pos_lower in page_text:
            detected_systems.append(pos)
            continue
        for script in soup.find_all("script", src=True):
            if pos_lower.replace(" ", "") in script["src"].lower():
                detected_systems.append(pos)
                break
        for meta in soup.find_all("meta"):
            content = (meta.get("content") or "").lower()
            if pos_lower in content:
                detected_systems.append(pos)
                break

    # Check for common POS integration patterns in HTML
    pos_indicators = {
        "Square": ["squareup.com", "square.site", "js.squareup.com"],
        "Toast": ["toasttab.com", "toast-restaurant", "toastpos"],
        "Clover": ["clover.com", "cloverfoodlab"],
        "Shopify POS": ["cdn.shopify.com", "myshopify.com"],
        "Lightspeed": ["lightspeedhq.com", "lightspeed-pos"],
        "TouchBistro": ["touchbistro.com"],
        "Revel": ["revelsystems.com"],
    }

    for pos_name, indicators in pos_indicators.items():
        for indicator in indicators:
            if indicator in html_lower:
                if pos_name.lower() not in [s.lower() for s in detected_systems]:
                    detected_systems.append(pos_name)
                break

    # Delivery services
    delivery = detect_delivery_services(html)

    # Website type
    website_type = detect_website_type(html, website_url)

    # Storefront detection
    storefront = detect_storefront(html)

    if detected_systems:
        result["has_pos"] = True
        result["pos_system"] = ", ".join(detected_systems)
        details = f"Detected POS: {', '.join(detected_systems)}"
        if delivery:
            details += f" | Delivery: {', '.join(delivery)}"
        result["pos_details"] = details
    elif delivery:
        result["has_pos"] = True
        result["pos_system"] = "Unknown (has delivery integration)"
        result["pos_details"] = f"Delivery: {', '.join(delivery)}"

    result["delivery_services"] = ", ".join(delivery) if delivery else ""
    result["website_type"] = website_type
    result["storefront"] = storefront

    return result
