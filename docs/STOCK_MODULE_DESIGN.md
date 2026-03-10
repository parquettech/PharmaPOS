# Stock Module Design - Important Documentation

## ⚠️ CRITICAL: Do Not Break This Design!

### Two Separate Modules:

1. **Stock.jsx (CRUD Module)**
   - Purpose: Manual entry and editing of stock items
   - Shows: ORIGINAL manual entries (e.g., 1000 units entered manually)
   - Behavior: Uses cached data, NEVER refreshes after sales
   - Updates: Only when user manually adds/edits/deletes on this page

2. **StockList.jsx (Current Quantities)**
   - Purpose: View current available stock quantities after sales
   - Shows: CURRENT available quantities (e.g., 500 after selling 500)
   - Behavior: Reads from database, refreshes after sales
   - Updates: Automatically when sales happen

### How It Works:

```
User enters: 1000 units in Stock module → Cached in sessionStorage
User sells: 500 units via Sales → Backend updates stock table: 1000 → 500
Result:
  - Stock.jsx: Still shows 1000 (from cache, doesn't refresh)
  - StockList.jsx: Shows 500 (reads from database, refreshes after sale)
```

### Rules to Prevent Breaking:

#### Stock.jsx:
- ❌ NEVER add: `window.addEventListener('stockUpdated', ...)`
- ❌ NEVER call `loadStock()` automatically after sales
- ✅ ALWAYS use cached data from `sessionStorage` when available
- ✅ ONLY refresh after CRUD operations on THIS page

#### StockList.jsx:
- ✅ DOES listen to `'stockUpdated'` event
- ✅ DOES refresh after sales to show current quantities
- ✅ Reads directly from database (updated by sales)

#### Sales.jsx:
- ✅ Updates stock table in backend (decreases quantities)
- ✅ Dispatches `'stockUpdated'` event for StockList.jsx only
- ⚠️ Stock.jsx intentionally does NOT listen to this event

### Why This Design?

- **Stock module** is for manual data entry - quantities should stay as entered unless manually changed
- **StockList** is for viewing current availability - should reflect sales in real-time
- This separation prevents confusion and data corruption

### Testing:

1. Enter 1000 units in Stock module
2. Sell 500 units via Sales
3. Verify:
   - Stock module still shows 1000 ✓
   - StockList shows 500 ✓
4. Edit in Stock module to 1200
5. Verify:
   - Stock module shows 1200 ✓
   - StockList shows 700 (1200 - 500 sold) ✓
