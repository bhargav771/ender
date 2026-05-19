-- Migration: Add performance indexes to LeadScraper Pro
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
--
-- These indexes target columns identified in WHERE, ORDER BY, JOIN, and
-- ILIKE clauses across the application code (app/database.py, app/main.py).
-- They are safe to run on an existing database (all use IF NOT EXISTS).

-- ═══════════════════════════════════════════════════════════════════════
-- 1. business_data.created_at DESC
--    Query: get_all_business_data() orders results by created_at DESC
--    Endpoints: GET /api/data, GET /api/export-db/:fmt
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_created_at
    ON business_data(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. GIN trigram index on business_data.search_query
--    Query: get_all_business_data() uses ILIKE '%industry%'
--    The existing B-tree index (idx_business_industry) cannot accelerate
--    middle-of-string ILIKE patterns; a GIN trigram index can.
--    Endpoints: GET /api/data?industry=..., GET /api/export-db/:fmt
-- ═══════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_business_search_query_trgm
    ON business_data USING gin (search_query gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Partial index on business_data.final_email (non-empty rows only)
--    Query: get_stats() counts rows where final_email is non-empty
--    Endpoint: GET /api/stats (loaded on every dashboard visit)
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_final_email_present
    ON business_data(final_email)
    WHERE final_email IS NOT NULL AND final_email != '';

-- ═══════════════════════════════════════════════════════════════════════
-- 4. business_data.has_pos
--    Query: Dashboard fetches all data and filters for POS statistics
--    Endpoint: GET /api/data (dashboard POS count)
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_has_pos
    ON business_data(has_pos);

-- ═══════════════════════════════════════════════════════════════════════
-- 5. business_data.city
--    Used in client-side result filtering and geographic queries
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_city
    ON business_data(city);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. business_data.zipcode
--    Geographic filtering by zip code
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_zipcode
    ON business_data(zipcode);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. Partial index on business_data.place_id (non-empty rows only)
--    Google Maps Place ID — useful for deduplication lookups
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_place_id
    ON business_data(place_id)
    WHERE place_id IS NOT NULL AND place_id != '';

-- ═══════════════════════════════════════════════════════════════════════
-- 8. business_data.closure_status
--    Filtering businesses by open / temporarily closed / permanently closed
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_business_closure_status
    ON business_data(closure_status);
