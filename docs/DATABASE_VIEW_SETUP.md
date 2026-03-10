# Database View Setup Guide

## 📋 Overview

A database view `stock_available` has been created to calculate available stock quantities dynamically. This view:
- **Preserves** original stock entries (stock table never changes)
- **Calculates** available quantities on-the-fly: `available = original - sold`
- **Eliminates** data modification conflicts
- **Always** shows accurate current quantities

---

## 🚀 Setup Instructions

### Step 1: Run the SQL Script in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `backend/database/stock_available_view.sql`
4. Paste and run the SQL script

**OR** run this SQL directly:

```sql
-- Drop view if exists (for updates)
DROP VIEW IF EXISTS stock_available;

-- Create the view
CREATE VIEW stock_available AS
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
    
    -- Calculate total sold quantities from sales_items
    COALESCE(SUM(si.qty), 0) AS sold_qty,
    COALESCE(SUM(si.free), 0) AS sold_free,
    
    -- Calculate available quantities
    GREATEST(0, COALESCE(s.qty, 0) - COALESCE(SUM(si.qty), 0)) AS available_qty,
    GREATEST(0, COALESCE(s.free, 0) - COALESCE(SUM(si.free), 0)) AS available_free,
    
    -- Total available (qty + free)
    GREATEST(0, COALESCE(s.qty, 0) - COALESCE(SUM(si.qty), 0)) + 
    GREATEST(0, COALESCE(s.free, 0) - COALESCE(SUM(si.free), 0)) AS total_available

FROM stock s
LEFT JOIN sales_items si ON 
    UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
    AND s.batch_no IS NOT NULL 
    AND s.batch_no != ''
    AND si.batch IS NOT NULL
    AND si.batch != ''
GROUP BY 
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
    s.qty,
    s.free;
```

### Step 2: Grant Permissions (if needed)

If you have RLS policies, you may need to grant access:

```sql
-- Grant access to the view (adjust based on your RLS setup)
-- The view inherits permissions from underlying tables
```

### Step 3: Verify the View

Test the view:

```sql
SELECT * FROM stock_available LIMIT 10;
```

You should see columns:
- `original_qty`, `original_free` (from stock table)
- `sold_qty`, `sold_free` (calculated from sales_items)
- `available_qty`, `available_free` (calculated: original - sold)
- All other stock columns

---

## 🔄 How It Works

### Before (Old Method):
```
1. You add stock: 1000 units → Database: qty = 1000
2. You sell: 500 units → Backend updates: qty = 500 (MODIFIED!)
3. StockList reads: qty = 500
```

**Problem:** Stock table gets modified, causing conflicts

### After (New Method with View):
```
1. You add stock: 1000 units → Database: qty = 1000 (UNCHANGED)
2. You sell: 500 units → sales_items table: qty = 500 (NEW RECORD)
3. View calculates: available_qty = 1000 - 500 = 500
4. StockList reads from view: available_qty = 500
```

**Solution:** Stock table never changes, view calculates dynamically

---

## 📊 View Structure

The view returns:

| Column | Description |
|--------|-------------|
| `id`, `s_no`, `description`, etc. | All original stock columns |
| `original_qty` | Original quantity from stock table |
| `original_free` | Original free quantity from stock table |
| `sold_qty` | Total sold quantity (sum from sales_items) |
| `sold_free` | Total sold free quantity (sum from sales_items) |
| `available_qty` | Available quantity = original_qty - sold_qty |
| `available_free` | Available free = original_free - sold_free |
| `total_available` | Total available = available_qty + available_free |

---

## ✅ Benefits

1. **No Data Modification**: Stock table remains unchanged
2. **Always Accurate**: Calculated on-the-fly from source data
3. **No Conflicts**: Original entries preserved
4. **Performance**: Database handles calculation efficiently
5. **Maintainable**: Single source of truth

---

## 🔧 Backend Integration

The backend now has:
- `/api/stock/` - Returns original stock entries (for Stock module)
- `/api/stock/available` - Returns available stock from view (for StockList)

If the view doesn't exist, the backend falls back to manual calculation.

---

## 🧪 Testing

1. Add stock: 1000 units
2. Check Stock module: Should show 1000 (original)
3. Make a sale: 500 units
4. Check StockList: Should show 500 (available)
5. Check Stock module again: Should still show 1000 (unchanged)

---

## ⚠️ Important Notes

- The view requires the `stock` and `sales_items` tables to exist
- Batch numbers are matched case-insensitively
- If batch number is NULL or empty, no sales are counted
- The view uses `LEFT JOIN` so stock items without sales still appear

---

## 🔄 Migration from Old Method

If you were using the old method (stock table gets updated):
1. The view will still work correctly
2. You may want to restore original quantities in stock table
3. Future sales won't modify stock table (if you remove that logic)

**Optional:** Restore original quantities:
```sql
-- This is optional - only if you want to restore original quantities
-- that were modified by previous sales
UPDATE stock s
SET qty = (
    SELECT COALESCE(s.qty, 0) + COALESCE(SUM(si.qty), 0)
    FROM sales_items si
    WHERE UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
    GROUP BY si.batch
)
WHERE EXISTS (
    SELECT 1 FROM sales_items si
    WHERE UPPER(TRIM(s.batch_no)) = UPPER(TRIM(si.batch))
);
```

---

## 📝 Next Steps

1. ✅ Run the SQL script in Supabase
2. ✅ Restart your backend server
3. ✅ Test StockList - it should now use the view
4. ✅ Verify available quantities are correct

The system will automatically use the view if it exists, or fall back to manual calculation if not.
