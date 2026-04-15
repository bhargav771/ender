# Restaurant Leads Scraper

A full-stack web application for scraping restaurant and business leads from Google Maps with deep email extraction and POS (Point of Sale) system detection.

Built with **FastAPI** (backend) and a modern **HTML/CSS/JS** frontend with a dark-themed dashboard UI.

## Features

- **Google Maps Scraping** — Search by category + zip code to find businesses
- **Deep Email Extraction** — Extracts emails from:
  - Google Maps listing
  - Business website (homepage + contact/about pages)
  - Facebook page (About section)
  - Instagram bio
- **POS System Detection** — Detects 40+ POS systems (Square, Toast, Clover, Lightspeed, etc.)
- **Social Media Links** — Facebook, Instagram, Twitter, LinkedIn
- **Bulk Scraping** — Input multiple search terms and zip codes for batch processing
- **Fast Parallel Scraping** — Concurrent browser contexts + async HTTP requests
- **Export** — Download results as CSV or JSON
- **Real-time Progress** — Live progress bar and result updates
- **Filter & Search** — Filter results by name, email, city, etc.

## Data Fields

| Field | Description |
|-------|-------------|
| Name | Business name |
| Address | Full address |
| Phone | Phone number |
| Website | Business website URL |
| Final Email | Best email found (prioritized) |
| All Website Emails | All emails found on website |
| Facebook Email | Email from Facebook page |
| Instagram Email | Email from Instagram |
| Google Maps Email | Email from Maps listing |
| Email Source | Where the final email came from |
| Facebook / Instagram / Twitter / LinkedIn | Social media profile links |
| Rating | Google Maps rating |
| Reviews Count | Number of reviews |
| Price Range | Price level |
| Cuisine Types | Category/cuisine type |
| Opening Hours | Business hours |
| Closure Status | Open / Temporarily Closed / Permanently Closed |
| POS Detected | Yes/No |
| POS System | Name of detected POS system(s) |
| POS Details | Additional POS and online ordering info |
| Maps URL | Google Maps link |
| Place ID | Google Maps Place ID |

## Setup

### Prerequisites

- Python 3.10+
- pip

### Installation

```bash
# Clone the repo
git clone https://github.com/darkweb15/restaurant-leads-scraper.git
cd restaurant-leads-scraper

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### Run the App

```bash
python run.py
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Usage

1. **Enter Search Terms** — One per line (e.g., `liquor stores`, `wine shops`)
2. **Enter Zip Codes** — One per line in format: `zipcode city state country`
   - Example: `10001 New York NY USA`
3. **Set Max Results** — Maximum results per search combination
4. **Click "Start Scraping"** — Watch real-time progress
5. **Export Results** — Download as CSV or JSON

## Tech Stack

- **Backend**: FastAPI + Uvicorn
- **Scraping**: Playwright (headless Chrome)
- **Email Extraction**: aiohttp + BeautifulSoup
- **Frontend**: HTML5 + CSS3 + Vanilla JS
- **Styling**: Custom dark theme (no frameworks needed)

## Project Structure

```
restaurant-leads-scraper/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app & routes
│   ├── models.py             # Pydantic data models
│   ├── config.py             # Configuration
│   ├── exporter.py           # CSV/JSON export
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── google_maps.py    # Google Maps scraper
│   │   ├── email_extractor.py # Deep email extraction
│   │   ├── pos_detector.py   # POS system detection
│   │   └── orchestrator.py   # Job orchestration
│   ├── templates/
│   │   └── index.html        # Dashboard UI
│   └── static/
│       ├── css/style.css     # Dark theme styles
│       └── js/app.js         # Frontend logic
├── output/                   # Export files saved here
├── requirements.txt
├── run.py                    # Entry point
└── README.md
```

## License

MIT
