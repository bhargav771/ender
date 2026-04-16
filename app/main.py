"""FastAPI application for the Restaurant Leads Scraper."""

import logging
import os
import secrets
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

from app.models import ScrapeRequest
from app.scraper.orchestrator import run_scrape_job, get_job, get_all_jobs
from app.exporter import export_to_csv, export_to_json
from app import database as db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="Restaurant Leads Scraper", version="2.0.0")

# ─── CORS Configuration ───────────────────────────────────────────────
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:8000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ─── Security Headers Middleware ──────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ─── API Key Authentication ───────────────────────────────────────────
API_KEY = os.environ.get("API_KEY", "")


def verify_api_key(request: Request) -> None:
    """Verify API key for protected endpoints. Skipped if API_KEY is not set."""
    if not API_KEY:
        return
    provided = request.headers.get("X-API-Key", "")
    if not secrets.compare_digest(provided, API_KEY):
        raise HTTPException(status_code=403, detail="Invalid or missing API key")

# Static files and templates
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render the main dashboard."""
    return templates.TemplateResponse("index.html", {"request": request})


# ─── Scraping Endpoints ─────────────────────────────────────────────

@app.post("/api/scrape")
async def start_scrape(request: ScrapeRequest, _auth: None = Depends(verify_api_key)):
    """Start a new scraping job."""
    if not request.search_terms or not request.zip_codes:
        return JSONResponse(
            status_code=400,
            content={"error": "Please provide at least one search term and one zip code."},
        )

    request.search_terms = [s.strip() for s in request.search_terms if s.strip()]
    request.zip_codes = [z.strip() for z in request.zip_codes if z.strip()]

    job_id = await run_scrape_job(request)
    return {"job_id": job_id, "message": "Scraping job started!"}


@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a scraping job (real-time from memory)."""
    job = get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    # Calculate ETA
    eta_seconds = None
    elapsed_seconds = None
    if job.started_at:
        elapsed_seconds = (datetime.utcnow() - job.started_at).total_seconds()
        if job.leads_per_combination and job.completed < job.total:
            avg_time = sum(job.leads_per_combination) / len(job.leads_per_combination)
            remaining = job.total - job.completed
            eta_seconds = round(avg_time * remaining)

    return {
        "job_id": job.job_id,
        "status": job.status,
        "total": job.total,
        "completed": job.completed,
        "results_count": len(job.results),
        "errors": job.errors,
        "results": [r.model_dump() for r in job.results],
        "duplicates_skipped": job.duplicates_skipped,
        "eta_seconds": eta_seconds,
        "elapsed_seconds": round(elapsed_seconds) if elapsed_seconds else None,
    }


@app.get("/api/jobs")
async def list_jobs():
    """List all scraping jobs (from memory, current session)."""
    jobs = get_all_jobs()
    return [
        {
            "job_id": j.job_id,
            "status": j.status,
            "total": j.total,
            "completed": j.completed,
            "results_count": len(j.results),
        }
        for j in jobs
    ]


# ─── Database Task History Endpoints ────────────────────────────────

@app.get("/api/tasks")
async def list_tasks():
    """Get all task history from database (persisted across restarts)."""
    tasks = await db.get_all_tasks()
    return {"tasks": tasks}


@app.delete("/api/tasks/{job_id}")
async def delete_task(job_id: str, _auth: None = Depends(verify_api_key)):
    """Delete a task and all its associated data from database."""
    ok = await db.delete_task(job_id)
    if ok:
        return {"message": f"Task {job_id} and all its data deleted."}
    return JSONResponse(status_code=500, content={"error": "Failed to delete task."})


@app.get("/api/tasks/{job_id}/results")
async def get_task_results(job_id: str):
    """Get all results for a specific task from database."""
    results = await db.get_task_results(job_id)
    return {"results": results, "count": len(results)}


# ─── Database Business Data Endpoints ───────────────────────────────

@app.get("/api/data")
async def get_business_data(industry: str = "", limit: int = 5000):
    """Get all business data, optionally filtered by industry."""
    limit = min(limit, 10000)
    data = await db.get_all_business_data(industry=industry, limit=limit)
    return {"data": data, "count": len(data)}


@app.get("/api/industries")
async def get_industries():
    """Get list of unique industries/search queries in database."""
    industries = await db.get_industries()
    return {"industries": industries}


@app.get("/api/stats")
async def get_stats():
    """Get overall database statistics."""
    stats = await db.get_stats()
    return stats


@app.delete("/api/data")
async def delete_all_data(_auth: None = Depends(verify_api_key)):
    """Delete ALL business data and tasks. Use with caution."""
    ok = await db.delete_all_data()
    if ok:
        return {"message": "All data deleted successfully."}
    return JSONResponse(status_code=500, content={"error": "Failed to delete data."})


# ─── Export Endpoints ───────────────────────────────────────────────

@app.get("/api/export-task/{job_id}/{fmt}")
async def export_task_results(job_id: str, fmt: str):
    """Export task results from database as CSV or JSON."""
    results = await db.get_task_results(job_id)
    if not results:
        return JSONResponse(status_code=400, content={"error": "No results for this task"})

    from app.models import LeadResult
    leads = []
    for row in results:
        lead = LeadResult()
        for field in lead.model_fields:
            if field in row and row[field] is not None:
                setattr(lead, field, str(row[field]))
        leads.append(lead)

    if fmt == "csv":
        content = export_to_csv(leads)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=task_{job_id}.csv"},
        )
    elif fmt == "json":
        content = export_to_json(leads)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=task_{job_id}.json"},
        )
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid format. Use 'csv' or 'json'."})


@app.get("/api/export/{job_id}/{fmt}")
async def export_results(job_id: str, fmt: str):
    """Export job results as CSV or JSON (from memory)."""
    job = get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    if not job.results:
        return JSONResponse(status_code=400, content={"error": "No results to export"})

    if fmt == "csv":
        content = export_to_csv(job.results)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads_{job_id}.csv"},
        )
    elif fmt == "json":
        content = export_to_json(job.results)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads_{job_id}.json"},
        )
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid format. Use 'csv' or 'json'."})


@app.get("/api/export-db/{fmt}")
async def export_db_data(fmt: str, industry: str = ""):
    """Export database data as CSV or JSON, optionally filtered by industry."""
    data = await db.get_all_business_data(industry=industry)
    if not data:
        return JSONResponse(status_code=400, content={"error": "No data to export"})

    # Convert DB rows to LeadResult objects for the exporter
    from app.models import LeadResult
    leads = []
    for row in data:
        lead = LeadResult()
        for field in lead.model_fields:
            if field in row and row[field] is not None:
                setattr(lead, field, str(row[field]))
        leads.append(lead)

    suffix = f"_{industry}" if industry else "_all"

    if fmt == "csv":
        content = export_to_csv(leads)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads{suffix}.csv"},
        )
    elif fmt == "json":
        content = export_to_json(leads)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads{suffix}.json"},
        )
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid format. Use 'csv' or 'json'."})
