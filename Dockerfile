FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install only Chromium browser for Playwright
RUN playwright install chromium

# Copy application code
COPY . .

# Create output directory
RUN mkdir -p output

# Railway sets PORT env var; default to 8000
ENV PORT=8000

# Run with uvicorn (no reload in production)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
