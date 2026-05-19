# Testing the ScrapePro App

## Prerequisites

- **Secrets required**: `SUPABASE_URL` and `SUPABASE_KEY` environment variables must be set
- **Python dependencies**: `pip install -r requirements.txt` (includes supabase, fastapi, playwright)
- **Playwright browsers**: `playwright install chromium`

## Starting the Server

```bash
source venv/bin/activate
SUPABASE_URL=$SUPABASE_URL SUPABASE_KEY=$SUPABASE_KEY python run.py
```

Server runs at `http://localhost:8000`. Static files (JS/CSS/HTML) are served from disk, so code changes are reflected without restart.

## App Structure — 6 Tabs

All tabs are in the left sidebar. Click each to switch:

1. **Dashboard** — Stat cards (Total Jobs, Records Collected, Emails Found, POS Detected), Success Rate panel, Quick Actions, Recent Runs table
2. **Scraper Control Panel** — Wizard config with search terms, zip codes, max results. "Run Scraper" button triggers `POST /api/scrape`. Live Monitor shows progress.
3. **Data Table View** — Database records table with 8 columns (COMPANY, DOMAIN, INDUSTRY, EMAIL, PHONE, RATING, POS SYSTEM, STATUS). Supports search/filter and export (CSV/JSON).
4. **Enrichment Module** — Task history with View/Delete actions per task. "Delete All" button at top right.
5. **Logs & Monitoring** — System health stats (hardcoded placeholders), log stream with level filters (All/Error/Warn/Info). Logs are client-side JS events only.
6. **Settings** — API key input (saved to localStorage as `scrapepro_api_key`), Supabase connection status indicator. Two sub-tabs: API Keys and General.

## Key Test Scenarios

### Data Table — Malformed URL Handling
The `renderDbTable` function uses `new URL()` wrapped in try/catch. Test with records that have:
- Empty website field → should show `-` in DOMAIN column
- Non-http prefixed URLs (e.g. `nvwe.com`) → should resolve via `https://` prefix
- Malformed URLs → should fall back to regex extraction, no JS errors in console

### API Key Authentication
When `API_KEY` env var is set on the server, these endpoints require `X-API-Key` header:
- `POST /api/scrape`
- `DELETE /api/tasks/{job_id}`
- `DELETE /api/data`

The frontend reads the key from `localStorage` via `getApiHeaders()`. To test:
1. Start server with `API_KEY=somekey`
2. Go to Settings tab, enter the key, click Save
3. Trigger a scrape or delete — should succeed
4. Clear the key or enter wrong key — should get 403 error toast

### Supabase Connection
The Settings tab shows Supabase status via `/api/stats` endpoint. Green dot = connected.

## Protected Endpoints (require API key when API_KEY is set)
- `POST /api/scrape` — Start a scraping job
- `DELETE /api/tasks/{job_id}` — Delete a specific task
- `DELETE /api/data` — Delete all data

## Read-only Endpoints (no auth required)
- `GET /api/stats` — Dashboard statistics
- `GET /api/tasks` — Task history
- `GET /api/data` — Database records
- `GET /api/industries` — Industry list for filtering
- `GET /api/export-db/{format}` — Export data as CSV/JSON
