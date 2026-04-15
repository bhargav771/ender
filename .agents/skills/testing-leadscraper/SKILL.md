# Testing LeadScraper Pro

## Overview
LeadScraper Pro is a FastAPI + Playwright app that scrapes Google Maps for alcohol-related business leads, extracts emails from multiple sources, detects POS systems, and stores results in Supabase.

## Devin Secrets Needed
- `SUPABASE_URL` — Must be the **API URL** format: `https://<project-id>.supabase.co` (NOT the dashboard URL `https://supabase.com/dashboard/project/...`)
- `SUPABASE_KEY` — Supabase anon or service_role key

## Environment Setup

```bash
cd /home/ubuntu/repos/restaurant-leads-scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

### Starting the Server
```bash
SUPABASE_URL="https://<project-id>.supabase.co" uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Supabase Tables
The app requires two tables: `scraping_tasks` and `business_data`. If they don't exist, the app still works but DB features (task history, database explorer, duplicate prevention) will show empty/gracefully degrade. The schema is in `supabase_schema.sql` — the user must run it manually in Supabase SQL Editor.

To verify tables exist:
```python
from supabase import create_client
client = create_client(url, key)
client.table('scraping_tasks').select('id').limit(1).execute()
client.table('business_data').select('id').limit(1).execute()
```

## Testing Procedure

### 1. Verify App Loads
- Navigate to `http://localhost:8000/`
- Check all 4 sidebar tabs render: Dashboard, Scraper, Task History, Database
- Verify "Supabase Connected" indicator at bottom of sidebar

### 2. Test Scraping Flow
Use small test parameters to keep scraping fast:
- **Search terms:** `wine stores` (single term)
- **Zip codes:** `94102 San Francisco CA USA` (single zip)
- **Max results:** `5`

Expected: ~5 results in 30-60 seconds. Typically 1-3 will have emails, 1-2 will have POS detected.

Good test stores that reliably return emails:
- San Francisco Wine & Cheese → `sfwineandcheese@gmail.com`
- Flatiron Wines & Spirits → `help@flatiron-wines.com`

### 3. Test Export
- Click CSV button after scraping completes
- Verify file downloads with correct name pattern: `leads_{job_id}.csv`

### 4. Test DB Features (requires Supabase tables)
- After scraping: Task History tab should show the completed task
- Database Explorer should show saved leads with industry filter
- Run same scrape again to test duplicate prevention (should skip already-scraped businesses)

## Known Issues & Gotchas

1. **SUPABASE_URL format** — The secret might be stored as the dashboard URL instead of the API URL. Always verify and fix before testing.

2. **Scraping takes time** — Google Maps scraping with Playwright + email enrichment takes 30-90 seconds for 5 results. Don't panic if progress stays at 0% for 20-30s — the scraper is working.

3. **Email yield varies** — Not all stores have public emails. 30-50% email yield is normal for alcohol stores.

4. **Facebook email scraping** — Facebook aggressively blocks scraping. Facebook emails may not always be extracted even if the store has a Facebook page.

5. **Port conflicts** — If port 8000 is already in use, kill the old process with `fuser -k 8000/tcp` before restarting.

6. **The app gracefully handles missing DB** — All database functions return empty lists/False on error, so the scraper works in-memory even without Supabase tables. This means UI tests for Dashboard, Scraper tab, and CSV export work regardless of DB status.

## App Architecture
- **Backend:** FastAPI (`app/main.py`) with 14+ API endpoints
- **Frontend:** Single-page HTML (`app/templates/index.html`) with vanilla JS (`app/static/js/app.js`)
- **Scraper:** Playwright-based Google Maps scraper (`app/scraper/google_maps.py`)
- **Email extraction:** aiohttp + Playwright fallback (`app/scraper/email_extractor.py`)
- **POS detection:** Website scanning (`app/scraper/pos_detector.py`)
- **Database:** Supabase client (`app/database.py`)
- **Polling flow:** `POST /api/scrape` → returns job_id → poll `GET /api/job/{id}` every 2s
