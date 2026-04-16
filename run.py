"""Entry point to run the FastAPI application."""

import os

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    dev_mode = os.environ.get("DEV_MODE", "").lower() in ("1", "true", "yes")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=dev_mode)
