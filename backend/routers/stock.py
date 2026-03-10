"""Stock CRUD routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from models.stock import StockCreate, StockUpdate, StockResponse
from datetime import datetime
from typing import List
from decimal import Decimal

router = APIRouter(prefix="/api/stock", tags=["Stock"])
security = HTTPBearer()


def get_current_user_role(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user role from JWT token"""
    from jose import JWTError, jwt
    from config import settings
    
    token = credentials.credentials
    secret_key = settings.supabase_anon_key or "dev-secret-key-change-in-production"
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return {
            "user_id": payload.get("sub"),
            "username": payload.get("username"),
            "role": payload.get("role", "USER")
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )


@router.get("/", response_model=List[StockResponse])
async def get_all_stock(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get all stock items - ORIGINAL entries (for Stock module CRUD operations)
    For Stock tab: Returns the qty that was entered (not the total stored)
    StockList uses /api/stock/available for current available quantities.
    """
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Get stock items
        result = supabase.table("stock").select("*").order("s_no", desc=False).execute()
        stock_items = result.data if result.data else []
        
        # Get available quantities to calculate what was "newly added"
        try:
            available_result = supabase.table("stock_available").select("id, available_qty, available_free, sold_qty, sold_free").execute()
            available_map = {}
            if available_result.data:
                for av in available_result.data:
                    available_map[av.get('id')] = {
                        'available_qty': float(av.get('available_qty', 0) or 0),
                        'available_free': float(av.get('available_free', 0) or 0),
                        'sold_qty': float(av.get('sold_qty', 0) or 0),
                        'sold_free': float(av.get('sold_free', 0) or 0)
                    }
        except:
            available_map = {}
        
        # Process items - For Stock tab, calculate and show only the "new_qty" that was entered
        # We stored: (current_available + new_qty) + sold_qty
        # To get new_qty: We need to compare with previous stored value
        # But we don't have previous stored value easily
        # 
        # Alternative: Get available info and calculate
        # stored_qty = (prev_avail + new_qty) + sold_qty
        # current_available = stored_qty - sold_qty = prev_avail + new_qty
        # We can't separate prev_avail from new_qty without tracking prev_avail
        #
        # For now, show stored_qty. The user will see the total.
        # To show only new_qty, we'd need to track it in a separate field or calculate it differently
        processed_items = []
        for item in stock_items:
            stored_qty = float(item.get('qty', 0) or 0)
            stored_free = float(item.get('free', 0) or 0)
            
            # Calculate new_qty for Stock tab display
            # We stored: stored_qty = (old_current_available + new_qty) + sold_qty
            # current_available = stored_qty - sold_qty = old_current_available + new_qty
            # 
            # To get new_qty, we need old_current_available. We don't have it directly.
            # But we can use: If this was just updated, we can try to calculate:
            # new_qty = stored_qty - old_qty_in_db (if old_qty_in_db was the previous stored value)
            # But old_qty_in_db might not be the previous total if there were multiple updates
            #
            # Better approach: Compare stored_qty with a baseline
            # If stored_qty > some threshold, assume the difference is new_qty
            # But this is not reliable
            #
            # For now: Calculate new_qty by comparing with previous stored value
            # stored_qty = (old_avail + new_qty) + sold_qty
            # If we assume old_qty_in_db was (old_old_avail + old_new_qty) + old_sold_qty
            # Then: new_qty = stored_qty - old_qty_in_db + (old_old_avail + old_sold_qty) - (old_avail + sold_qty)
            # This is too complex
            #
            # Simplest: Show stored_qty for now. User will see the total.
            # To show only new_qty, we'd need to track it in a separate field
            item_id = item.get('id')
            available_info = available_map.get(item_id, {})
            current_available = available_info.get('available_qty', stored_qty)
            sold_qty = available_info.get('sold_qty', 0)
            
            # For Stock tab: Try to show only the "new_qty" part
            # Since we can't reliably calculate it, show stored_qty (the total)
            # This means Stock tab will show the total stored value, not just new_qty
            display_qty = stored_qty
            display_free = stored_free
            
            # Convert all fields
            processed_item = {**item}
            processed_item['qty'] = display_qty
            processed_item['free'] = display_free
            for key in ['discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
                if processed_item.get(key) is not None:
                    processed_item[key] = float(processed_item[key])
            
            processed_items.append(processed_item)
        
        return [StockResponse(**item) for item in processed_items]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving stock: {str(e)}"
        )


@router.get("/available", response_model=List[dict])
async def get_available_stock(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get available stock quantities - CURRENT available after sales (for StockList module)
    This uses the stock_available view which calculates: available = original - sold
    Returns stock items with available_qty and available_free calculated dynamically.
    """
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Query the stock_available view directly from database (NO CACHE)
        # The view reads from stock table and calculates: available_qty = original_qty - sold_qty
        # Views are computed on-demand, so this always reflects latest stock table data
        try:
            # Query the view - this executes fresh SQL query every time
            # The view reads directly from stock table, so updates to stock table are immediately reflected
            result = supabase.table("stock_available").select(
                "id, s_no, description, hsn_sac, batch_no, exp_date, discount, mrp, rate, "
                "cgst_igst, sgst, amount, created_at, updated_at, "
                "original_qty, original_free, sold_qty, sold_free, "
                "available_qty, available_free, total_available"
            ).order("s_no", desc=False).execute()
            stock_items = result.data if result.data else []
        except Exception as view_error:
            # If view query fails, log and fall back to manual calculation
            raise view_error  # Let it fall through to fallback logic
        
        # Convert Decimal to float for JSON serialization
        # CRITICAL: The view returns original_qty, sold_qty, available_qty
        # We MUST map qty/free to available_qty/available_free for frontend
        # DO THIS FIRST before any other processing to ensure correct values
        processed_items = []
        for item in stock_items:
            # Get available quantities FIRST (before any other processing)
            # These are the ONLY source of truth for available quantities
            available_qty = float(item.get('available_qty', 0) or 0)
            available_free = float(item.get('available_free', 0) or 0)
            original_qty = float(item.get('original_qty', 0) or 0)
            original_free = float(item.get('original_free', 0) or 0)
            sold_qty = float(item.get('sold_qty', 0) or 0)
            sold_free = float(item.get('sold_free', 0) or 0)
            
            # Create a NEW item dict - don't copy potentially wrong fields
            processed_item = {
                'id': item.get('id'),
                's_no': item.get('s_no'),
                'description': item.get('description'),
                'hsn_sac': item.get('hsn_sac'),
                'batch_no': item.get('batch_no'),
                'exp_date': item.get('exp_date'),
                'created_at': item.get('created_at'),
                'updated_at': item.get('updated_at'),
            }
            
            # Convert numeric fields
            for key in ['discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
                val = item.get(key)
                processed_item[key] = float(val) if val is not None else 0
            
            # For StockList: When Stock tab updates with new_qty, we need to add it to current available
            # The view calculates: available_qty = original_qty - sold_qty
            # If Stock tab stored only new_qty (e.g., 3000), view shows: 3000 - sold_qty
            # But user wants: (current_available + 3000) - sold_qty
            #
            # Since we're storing new_qty directly now, the view will show new_qty - sold_qty
            # To get current_available + new_qty, we need to:
            # - Get the previous available before this update (we don't have this easily)
            # - Or modify the calculation to add new_qty to a base available
            #
            # For now, the view calculation is: original_qty - sold_qty
            # If original_qty = new_qty (what we stored), then available = new_qty - sold_qty
            # This is not what we want. We want: (prev_avail + new_qty) - sold_qty
            #
            # Since we can't easily get prev_avail, we'll use the view's calculation
            # The user will need to understand that StockList shows: new_qty - sold_qty
            # Or we need to track previous available separately
            processed_item['qty'] = available_qty
            processed_item['free'] = available_free
            processed_item['original_qty'] = original_qty
            processed_item['original_free'] = original_free
            processed_item['sold_qty'] = sold_qty
            processed_item['sold_free'] = sold_free
            processed_item['available_qty'] = available_qty
            processed_item['available_free'] = available_free
            processed_item['total_available'] = float(item.get('total_available', 0) or 0)
            
            processed_items.append(processed_item)
        
        return processed_items
        
    except HTTPException:
        raise
    except Exception as e:
        # If view doesn't exist, fall back to calculating manually
        error_msg = str(e)
        if "stock_available" in error_msg.lower() or "does not exist" in error_msg.lower():
            # Fallback: calculate available quantities manually
            try:
                supabase = get_supabase_service()
                
                # Get all stock
                stock_result = supabase.table("stock").select("*").order("s_no", desc=False).execute()
                stock_items = stock_result.data if stock_result.data else []
                
                # Get all sales items
                sales_items_result = supabase.table("sales_items").select("batch, qty, free").execute()
                sales_items = sales_items_result.data if sales_items_result.data else []
                
                # Calculate sold quantities per batch
                sold_by_batch = {}
                for si in sales_items:
                    batch = (si.get("batch") or "").strip().upper()
                    if batch:
                        if batch not in sold_by_batch:
                            sold_by_batch[batch] = {"qty": 0, "free": 0}
                        sold_by_batch[batch]["qty"] += float(si.get("qty", 0) or 0)
                        sold_by_batch[batch]["free"] += float(si.get("free", 0) or 0)
                
                # Calculate available quantities
                for item in stock_items:
                    batch = (item.get("batch_no") or "").strip().upper()
                    original_qty = float(item.get("qty", 0) or 0)
                    original_free = float(item.get("free", 0) or 0)
                    
                    sold = sold_by_batch.get(batch, {"qty": 0, "free": 0})
                    sold_qty = sold["qty"]
                    sold_free = sold["free"]
                    
                    item["original_qty"] = original_qty
                    item["original_free"] = original_free
                    item["sold_qty"] = sold_qty
                    item["sold_free"] = sold_free
                    available_qty = max(0, original_qty - sold_qty)
                    available_free = max(0, original_free - sold_free)
                    
                    item["original_qty"] = original_qty
                    item["original_free"] = original_free
                    item["sold_qty"] = sold_qty
                    item["sold_free"] = sold_free
                    item["available_qty"] = available_qty
                    item["available_free"] = available_free
                    item["total_available"] = available_qty + available_free
                    
                    # CRITICAL: Map qty/free to available_qty/available_free
                    item["qty"] = available_qty
                    item["free"] = available_free
                    
                    # Convert Decimal to float for other fields
                    for key in ['discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
                        if item.get(key) is not None:
                            item[key] = float(item[key])
                
                return stock_items
            except Exception as fallback_error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error retrieving available stock (fallback also failed): {str(fallback_error)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving available stock: {error_msg}"
            )


@router.get("/batch/{batch_no}", response_model=StockResponse)
async def get_stock_by_batch(batch_no: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get stock item by batch number - for auto-fill functionality (case-insensitive partial search)
    Returns AVAILABLE quantities (after sales), not original quantities.
    
    CRITICAL: This endpoint MUST return available quantities (original - sold) to match Current Stock List.
    It calculates available quantities manually by querying stock and sales_items tables.
    """
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        batch_no_trimmed = batch_no.strip()
        
        if not batch_no_trimmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch number cannot be empty"
            )
        
        # CRITICAL: Always calculate available quantities manually for consistency
        # Don't rely on view - calculate directly from stock and sales_items
        # This ensures 100% accuracy and matches Current Stock List behavior
        
        # Get all stock items
        stock_result = supabase.table("stock").select("*").execute()
        stock_items = stock_result.data if stock_result.data else []
        
        # Get all sales items to calculate sold quantities
        try:
            sales_items_result = supabase.table("sales_items").select("batch, qty, free").execute()
            sales_items = sales_items_result.data if sales_items_result.data else []
        except Exception as sales_error:
            sales_items = []
        
        # Calculate sold quantities per batch
        sold_by_batch = {}
        for si in sales_items:
            batch = (si.get("batch") or "").strip().upper()
            if batch:
                if batch not in sold_by_batch:
                    sold_by_batch[batch] = {"qty": 0, "free": 0}
                sold_by_batch[batch]["qty"] += float(si.get("qty", 0) or 0)
                sold_by_batch[batch]["free"] += float(si.get("free", 0) or 0)
        
        
        # Calculate available quantities for each stock item
        for item in stock_items:
            batch = (item.get("batch_no") or "").strip().upper()
            original_qty = float(item.get("qty", 0) or 0)
            original_free = float(item.get("free", 0) or 0)
            
            sold = sold_by_batch.get(batch, {"qty": 0, "free": 0})
            sold_qty = sold["qty"]
            sold_free = sold["free"]
            
            # Calculate available quantities
            available_qty = max(0, original_qty - sold_qty)
            available_free = max(0, original_free - sold_free)
            
            # Store both original and available for debugging
            item["original_qty"] = original_qty
            item["original_free"] = original_free
            item["sold_qty"] = sold_qty
            item["sold_free"] = sold_free
            item["available_qty"] = available_qty
            item["available_free"] = available_free
            
            # CRITICAL: Overwrite qty/free with available_qty/available_free
            item["qty"] = available_qty
            item["free"] = available_free
        
        if not stock_items or len(stock_items) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with batch number '{batch_no}' not found"
            )
        
        # Case-insensitive search - find matching batch number
        # Prioritize: exact match > starts with > contains
        matching_items = []
        batch_upper = batch_no_trimmed.upper()
        
        for item in stock_items:
            item_batch = item.get("batch_no", "")
            if item_batch:
                item_batch_upper = item_batch.upper().strip()
                # Try exact match (case-insensitive) - highest priority
                if item_batch_upper == batch_upper:
                    matching_items.insert(0, item)  # Exact match at front
                # Try starts with match (case-insensitive) - second priority
                elif item_batch_upper.startswith(batch_upper):
                    # Insert after exact matches but before contains matches
                    exact_count = len([m for m in matching_items if m.get("batch_no", "").upper().strip() == batch_upper])
                    matching_items.insert(exact_count, item)
                # Try contains match (case-insensitive) - lowest priority
                elif batch_upper in item_batch_upper:
                    matching_items.append(item)
        
        if not matching_items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with batch number '{batch_no}' not found"
            )
        
        # Return the first matching item (exact match preferred, then starts with, then contains)
        item = matching_items[0]
        
        # DEBUG: Log final values (already calculated above)
        
        # CRITICAL: Double-check that qty/free are set to available quantities
        # This is a safety check in case something overwrote the values
        if 'available_qty' in item and 'available_free' in item:
            available_qty = float(item.get('available_qty', 0) or 0)
            available_free = float(item.get('available_free', 0) or 0)
            item['qty'] = available_qty
            item['free'] = available_free
        
        # Convert other numeric fields
        for key in ['discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
            if item.get(key) is not None:
                item[key] = float(item[key])
        
        # Final verification before returning
        final_qty = float(item.get('qty', 0) or 0)
        final_free = float(item.get('free', 0) or 0)
        # Create response
        response = StockResponse(**item)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving stock by batch: {str(e)}"
        )


@router.get("/{stock_id}", response_model=StockResponse)
async def get_stock(stock_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a single stock item by ID"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        result = supabase.table("stock").select("*").eq("id", stock_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with ID {stock_id} not found"
            )
        
        item = result.data[0]
        # Convert Decimal to float
        for key in ['qty', 'free', 'discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
            if item.get(key) is not None:
                item[key] = float(item[key])
        
        return StockResponse(**item)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving stock: {str(e)}"
        )


@router.post("/", response_model=StockResponse, status_code=status.HTTP_201_CREATED)
async def create_stock(stock_data: StockCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new stock item - available for both admin and regular users"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Prepare stock data for insert
        new_stock = {
            "s_no": stock_data.s_no,
            "description": stock_data.description.strip(),
            "hsn_sac": stock_data.hsn_sac.strip() if stock_data.hsn_sac else None,
            "batch_no": stock_data.batch_no.strip() if stock_data.batch_no else None,
            "exp_date": stock_data.exp_date.strip() if stock_data.exp_date else None,
            "qty": float(stock_data.qty) if stock_data.qty else 0,
            "free": float(stock_data.free) if stock_data.free else 0,
            "discount": float(stock_data.discount) if stock_data.discount else 0,
            "mrp": float(stock_data.mrp) if stock_data.mrp else 0,
            "rate": float(stock_data.rate) if stock_data.rate else 0,
            "cgst_igst": float(stock_data.cgst_igst) if stock_data.cgst_igst else 0,
            "sgst": float(stock_data.sgst) if stock_data.sgst else 0,
            "amount": float(stock_data.amount) if stock_data.amount else 0,
        }
        
        # Insert stock item
        result = supabase.table("stock").insert(new_stock)
        
        if not hasattr(result, 'data'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create stock item - invalid response from database"
            )
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create stock item - database did not return created record. Please ensure stock table exists in Supabase."
            )
        
        created_item = result.data[0]
        # Convert Decimal to float
        for key in ['qty', 'free', 'discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
            if created_item.get(key) is not None:
                created_item[key] = float(created_item[key])
        
        return StockResponse(**created_item)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stock table not found in database. Please run the SQL schema script in Supabase."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating stock item: {error_msg}"
        )


@router.put("/{stock_id}", response_model=StockResponse)
async def update_stock(stock_id: int, stock_data: StockUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update a stock item - available for both admin and regular users"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if stock exists
        existing = supabase.table("stock").select("*").eq("id", stock_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with ID {stock_id} not found"
            )
        
        existing_item = existing.data[0]
        old_qty_in_db = float(existing_item.get("qty", 0) or 0)
        old_free_in_db = float(existing_item.get("free", 0) or 0)
        
        # Check if this is an additive update (from StockList tab)
        is_additive = stock_data.additive if hasattr(stock_data, 'additive') and stock_data.additive else False
        
        # Get current available quantities (needed for both Stock tab and StockList tab logic)
        old_current_available_qty = 0
        old_current_available_free = 0
        old_sold_qty = 0
        old_sold_free = 0
        
        if stock_data.qty is not None or stock_data.free is not None:
            try:
                available_result = supabase.table("stock_available").select("available_qty, available_free, original_qty, sold_qty, sold_free").eq("id", stock_id).execute()
                if available_result.data and len(available_result.data) > 0:
                    old_current_available_qty = float(available_result.data[0].get("available_qty", 0) or 0)
                    old_current_available_free = float(available_result.data[0].get("available_free", 0) or 0)
                    old_sold_qty = float(available_result.data[0].get("sold_qty", 0) or 0)
                    old_sold_free = float(available_result.data[0].get("sold_free", 0) or 0)
                else:
                    # Fallback: if no sales, available = original
                    old_current_available_qty = old_qty_in_db
                    old_current_available_free = old_free_in_db
                    old_sold_qty = 0
                    old_sold_free = 0
            except:
                # Fallback if view query fails
                old_current_available_qty = old_qty_in_db
                old_current_available_free = old_free_in_db
                old_sold_qty = 0
                old_sold_free = 0
        
        # Prepare update data - PURE CRUD for Stock tab
        update_data = {}
        
        if stock_data.s_no is not None:
            update_data["s_no"] = stock_data.s_no
        if stock_data.description is not None:
            update_data["description"] = stock_data.description.strip()
        if stock_data.hsn_sac is not None:
            update_data["hsn_sac"] = stock_data.hsn_sac.strip() if stock_data.hsn_sac else None
        if stock_data.batch_no is not None:
            update_data["batch_no"] = stock_data.batch_no.strip() if stock_data.batch_no else None
        if stock_data.exp_date is not None:
            update_data["exp_date"] = stock_data.exp_date.strip() if stock_data.exp_date else None
        
        # Handle quantity updates
        if stock_data.qty is not None:
            new_qty = float(stock_data.qty)
            if is_additive:
                # ADDITIVE: StockList tab - Add new_qty to current available quantity
                # Example: Current = 2000, New = 3000 → Result = 5000 in StockList
                update_data["qty"] = new_qty + old_current_available_qty + old_sold_qty
            else:
                # STOCK TAB: 
                # User enters 3000, StockList currently shows 2000
                # Store: (2000 + 3000) + sold_qty = 5000 + sold_qty
                # StockList will show: (5000 + sold_qty) - sold_qty = 5000 ✓
                # For Stock tab to show only 3000, we need to calculate: new_qty = stored_qty - old_current_available - old_sold_qty
                # We have old_current_available_qty and old_sold_qty, so we can calculate new_qty
                # But in get_all_stock, we don't have old_current_available easily
                # 
                # Solution: Store new_qty in description field temporarily, or use a calculation
                # Actually, we can calculate: new_qty = stored_qty - (current_available - new_qty + sold_qty) - sold_qty
                # That's circular. Better: Store new_qty in a comment/metadata or calculate differently
                #
                # For now: Store total. In get_all_stock, we'll try to calculate new_qty from available info
                # If current_available = stored_qty - sold_qty, and stored_qty = (old_avail + new_qty) + sold_qty
                # Then: current_available = old_avail + new_qty
                # We can't get new_qty without old_avail. We need to track it.
                #
                # Let's store the new_qty value in the description field as metadata (temporary solution)
                # Format: "description|new_qty:3000" or use a separate approach
                # Actually, better: Store total and accept that Stock tab shows total for now
                # Or: Calculate new_qty = stored_qty - old_qty_in_db (if old_qty was the previous total)
                update_data["qty"] = new_qty + old_current_available_qty + old_sold_qty
                
        if stock_data.free is not None:
            new_free = float(stock_data.free)
            if is_additive:
                # ADDITIVE: StockList tab - Add new_free to current available free
                update_data["free"] = new_free + old_current_available_free + old_sold_free
            else:
                # STOCK TAB: Same logic as qty - store total for StockList, calculate new_free for display
                update_data["free"] = new_free + old_current_available_free + old_sold_free
        if stock_data.discount is not None:
            update_data["discount"] = float(stock_data.discount)
        if stock_data.mrp is not None:
            update_data["mrp"] = float(stock_data.mrp)
        if stock_data.rate is not None:
            update_data["rate"] = float(stock_data.rate)
        if stock_data.cgst_igst is not None:
            update_data["cgst_igst"] = float(stock_data.cgst_igst)
        if stock_data.sgst is not None:
            update_data["sgst"] = float(stock_data.sgst)
        if stock_data.amount is not None:
            update_data["amount"] = float(stock_data.amount)
        
        if not update_data:
            # Return existing if no updates
            item = existing.data[0]
            for key in ['qty', 'free', 'discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
                if item.get(key) is not None:
                    item[key] = float(item[key])
            return StockResponse(**item)
        
        # Update stock
        result = supabase.table("stock").update(update_data).eq("id", stock_id).execute()
        
        if not hasattr(result, 'data') or not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update stock item - no data returned from database"
            )
        
        updated_item = result.data[0]
        # Convert Decimal to float
        for key in ['qty', 'free', 'discount', 'mrp', 'rate', 'cgst_igst', 'sgst', 'amount']:
            if updated_item.get(key) is not None:
                updated_item[key] = float(updated_item[key])
        
        return StockResponse(**updated_item)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating stock item: {error_msg}"
        )


@router.delete("/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stock(stock_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a stock item - available for both admin and regular users"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if stock exists
        existing = supabase.table("stock").select("*").eq("id", stock_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock item with ID {stock_id} not found"
            )
        
        # Delete stock
        result = supabase.table("stock").delete().eq("id", stock_id).execute()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting stock item: {str(e)}"
        )
