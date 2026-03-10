"""Sales CRUD routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from models.sale import SaleCreate, SaleResponse
from datetime import datetime
from typing import List
from decimal import Decimal

router = APIRouter(prefix="/api/sales", tags=["Sales"])
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


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(sale_data: SaleCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new sale"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Calculate totals from items
        gross_amount = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        
        for item in sale_data.items:
            gross_amount += item.amount - item.cgst_amount - item.sgst_amount
            cgst_amount += item.cgst_amount
            sgst_amount += item.sgst_amount
        
        total_amount = gross_amount + cgst_amount + sgst_amount
        
        # Round total amount
        rounded_amount = round(total_amount)
        
        # Create sale record
        sale_record = {
            "middleman_id": sale_data.middleman_id,
            "third_party_id": sale_data.third_party_id,
            "invoice_no": sale_data.invoice_no,
            "bill_no": sale_data.bill_no,
            "sale_date": sale_data.sale_date.isoformat() if hasattr(sale_data.sale_date, 'isoformat') else sale_data.sale_date,
            "order_date": sale_data.order_date.isoformat() if sale_data.order_date and hasattr(sale_data.order_date, 'isoformat') else (sale_data.order_date if sale_data.order_date else None),
            "order_no": sale_data.order_no,
            "terms": sale_data.terms or 'CASH/CREDIT',
            "paid_amount": float(sale_data.paid_amount),
            "gross_amount": float(gross_amount),
            "cgst_amount": float(cgst_amount),
            "sgst_amount": float(sgst_amount),
            "total_amount": float(total_amount),
            "rounded_amount": float(rounded_amount)
        }
        
        # Insert sale (insert() already returns Response object, no need for .execute())
        sale_result = supabase.table("sales").insert(sale_record)
        
        if not hasattr(sale_result, 'data') or not sale_result.data or len(sale_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create sale - no data returned"
            )
        
        sale_id = sale_result.data[0]["id"]
        
        # Create sale items
        items_data = []
        for item in sale_data.items:
            item_record = {
                "sale_id": sale_id,
                "description": item.description,
                "hsn": item.hsn,
                "batch": item.batch,
                "expiry": item.expiry.isoformat() if item.expiry else None,
                "qty": float(item.qty),
                "free": float(item.free),
                "disc_percent": float(item.disc_percent),
                "mrp": float(item.mrp),
                "price": float(item.price),
                "gst_percent": float(item.gst_percent),
                "cgst_amount": float(item.cgst_amount),
                "sgst_amount": float(item.sgst_amount),
                "amount": float(item.amount)
            }
            items_data.append(item_record)
        
        if items_data:
            # Insert items (insert() already returns Response object, no need for .execute())
            supabase.table("sales_items").insert(items_data)
            
            # ⚠️ CRITICAL: DO NOT update stock table directly!
            # The stock_available view calculates available quantities dynamically:
            # available_qty = original_qty - SUM(sold_qty from sales_items)
            # 
            # If we update the stock table here, we get DOUBLE SUBTRACTION:
            # 1. Backend updates: stock.qty = 3600 - 3000 = 600
            # 2. View calculates: available = 600 - 3000 = 0 ❌ WRONG!
            #
            # Correct approach (current):
            # 1. Backend does NOT update stock table (keeps original 3600)
            # 2. View calculates: available = 3600 - 3000 = 600 ✅ CORRECT!
            #
            # Stock.jsx shows original entries (from cache, never changes)
            # StockList.jsx shows available quantities (from view, calculated dynamically)
            
        
        # Fetch the complete sale with items
        sale_result = supabase.table("sales").select("*").eq("id", sale_id).execute()
        items_result = supabase.table("sales_items").select("*").eq("sale_id", sale_id).execute()
        
        sale = sale_result.data[0]
        sale["items"] = items_result.data if items_result.data else []
        
        return SaleResponse(**sale)
        
    except HTTPException:
        raise
    except ValueError as e:
        # Validation errors from Pydantic
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        error_msg = str(e)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating sale: {error_msg}"
        )


@router.get("/", response_model=List[SaleResponse])
async def get_all_sales(
    from_date: str = None,
    to_date: str = None,
    middleman_id: int = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all sales with optional filters"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        query = supabase.table("sales").select("*")
        
        # Apply date filters - ensure dates are in correct format
        if from_date:
            # Ensure from_date is in YYYY-MM-DD format
            from_date_str = str(from_date).strip()
            if from_date_str:
                query = query.gte("sale_date", from_date_str)
        if to_date:
            # Ensure to_date is in YYYY-MM-DD format and includes the full day
            to_date_str = str(to_date).strip()
            if to_date_str:
                query = query.lte("sale_date", to_date_str)
        if middleman_id:
            query = query.eq("middleman_id", middleman_id)
        
        result = query.order("sale_date", desc=True).execute()
        
        sales = result.data if result.data else []
        
        # Fetch items for each sale
        sale_responses = []
        for sale in sales:
            items_result = supabase.table("sales_items").select("*").eq("sale_id", sale["id"]).execute()
            sale["items"] = items_result.data if items_result.data else []
            sale_responses.append(SaleResponse(**sale))
        
        return sale_responses
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sales: {str(e)}"
        )


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(sale_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a single sale by ID"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        result = supabase.table("sales").select("*").eq("id", sale_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sale with ID {sale_id} not found"
            )
        
        sale = result.data[0]
        
        # Fetch items
        items_result = supabase.table("sales_items").select("*").eq("sale_id", sale_id).execute()
        sale["items"] = items_result.data if items_result.data else []
        
        return SaleResponse(**sale)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sale: {str(e)}"
        )


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sale(sale_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a sale - stock quantities automatically recalculated by view"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Get sale with items before deleting
        sale_result = supabase.table("sales").select("*").eq("id", sale_id).execute()
        if not sale_result.data or len(sale_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sale with ID {sale_id} not found"
            )
        
        sale = sale_result.data[0]
        items_result = supabase.table("sales_items").select("*").eq("sale_id", sale_id).execute()
        items = items_result.data if items_result.data else []
        
        # ⚠️ CRITICAL: DO NOT restore stock quantities!
        # The stock_available view calculates available quantities dynamically from sales_items.
        # When we delete a sale, the sales_items are deleted, so the view automatically
        # recalculates: available = original - remaining_sold
        # 
        # Stock table remains unchanged (original entries preserved)
        # View automatically reflects the deletion when sales_items are removed
        
        # Delete sale items first (foreign key constraint)
        supabase.table("sales_items").delete().eq("sale_id", sale_id).execute()
        
        # Delete sale
        supabase.table("sales").delete().eq("id", sale_id).execute()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting sale: {str(e)}"
        )