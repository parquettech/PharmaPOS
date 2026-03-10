-- Stock Available View
-- This view calculates available stock quantities dynamically
-- by subtracting sold quantities from original stock entries
-- 
-- Benefits:
-- 1. Original stock table remains unchanged
-- 2. Available quantities calculated on-the-fly
-- 3. Always accurate and up-to-date
-- 4. No data modification conflicts

-- Drop view if exists (for updates)
-- Use CASCADE to drop dependent objects if any
DROP VIEW IF EXISTS stock_available CASCADE;

-- Create or replace the view (CREATE OR REPLACE works better in Supabase)
CREATE OR REPLACE VIEW stock_available AS
SELECT 
    s.id,
    s.s_no,
    s.description,
    s.hsn_sac,
    s.batch_no,
    s.exp_date,
    s.discount,
    s.mrp,
    s.rate,
    s.cgst_igst,
    s.sgst,
    s.amount,
    s.created_at,
    s.updated_at,
    
    -- Original quantities (from stock table)
    COALESCE(s.qty, 0) AS original_qty,
    COALESCE(s.free, 0) AS original_free,
    
    -- Calculate total sold quantities from sales_items (using subquery to prevent double counting)
    -- Using subquery instead of JOIN to avoid any potential duplicate counting issues
    -- More robust matching: handle NULL, empty strings, and case differences
    COALESCE((
        SELECT SUM(si.qty)
        FROM sales_items si
        WHERE 
            -- Both must be non-null and non-empty
            s.batch_no IS NOT NULL 
            AND s.batch_no != ''
            AND si.batch IS NOT NULL
            AND si.batch != ''
            -- Normalize and compare (case-insensitive, trimmed)
            AND UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
    ), 0) AS sold_qty,
    
    COALESCE((
        SELECT SUM(si.free)
        FROM sales_items si
        WHERE 
            s.batch_no IS NOT NULL 
            AND s.batch_no != ''
            AND si.batch IS NOT NULL
            AND si.batch != ''
            AND UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
    ), 0) AS sold_free,
    
    -- Calculate available quantities
    GREATEST(0, 
        COALESCE(s.qty, 0) - COALESCE((
            SELECT SUM(si.qty)
            FROM sales_items si
            WHERE 
                s.batch_no IS NOT NULL 
                AND s.batch_no != ''
                AND si.batch IS NOT NULL
                AND si.batch != ''
                AND UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
        ), 0)
    ) AS available_qty,
    
    GREATEST(0, 
        COALESCE(s.free, 0) - COALESCE((
            SELECT SUM(si.free)
            FROM sales_items si
            WHERE 
                s.batch_no IS NOT NULL 
                AND s.batch_no != ''
                AND si.batch IS NOT NULL
                AND si.batch != ''
                AND UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
        ), 0)
    ) AS available_free,
    
    -- Total available (qty + free)
    GREATEST(0, 
        COALESCE(s.qty, 0) - COALESCE((
            SELECT SUM(si.qty)
            FROM sales_items si
            WHERE 
                s.batch_no IS NOT NULL 
                AND s.batch_no != ''
                AND si.batch IS NOT NULL
                AND si.batch != ''
                AND UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
        ), 0)
    ) + 
    GREATEST(0, 
        COALESCE(s.free, 0) - COALESCE((
            SELECT SUM(si.free)
            FROM sales_items si
            WHERE 
                s.batch_no IS NOT NULL 
                AND s.batch_no != ''
                AND si.batch IS NOT NULL
                AND si.batch != ''
                AND UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
        ), 0)
    ) AS total_available

FROM stock s;

-- Create index on the view (if supported) or on underlying tables
-- Note: Some databases don't support indexes on views, so we rely on indexes on base tables

-- Grant permissions (adjust based on your RLS policies)
-- The view will inherit permissions from the underlying tables

-- Add comment
COMMENT ON VIEW stock_available IS 
'View that calculates available stock quantities by subtracting sold quantities from original stock entries. 
Use this view for StockList to show current available quantities without modifying the original stock table.';
