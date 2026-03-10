"""Purchases CRUD routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from models.purchase import PurchaseCreate, PurchaseResponse
from datetime import datetime
from typing import List
from decimal import Decimal

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])
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


@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase(purchase_data: PurchaseCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new purchase"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Calculate totals from items
        gross_amount = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        
        for item in purchase_data.items:
            gross_amount += item.amount - item.cgst_amount - item.sgst_amount
            cgst_amount += item.cgst_amount
            sgst_amount += item.sgst_amount
        
        total_amount = gross_amount + cgst_amount + sgst_amount
        
        # Round total amount
        rounded_amount = round(total_amount)
        
        # Create purchase record
        purchase_record = {
            "supplier_id": purchase_data.supplier_id,
            "middleman_id": purchase_data.middleman_id,
            "invoice_no": purchase_data.invoice_no,
            "bill_no": purchase_data.bill_no,
            "purchase_date": purchase_data.purchase_date.isoformat() if hasattr(purchase_data.purchase_date, 'isoformat') else purchase_data.purchase_date,
            "order_date": purchase_data.order_date.isoformat() if purchase_data.order_date and hasattr(purchase_data.order_date, 'isoformat') else (purchase_data.order_date if purchase_data.order_date else None),
            "order_no": purchase_data.order_no,
            "terms": purchase_data.terms or 'CASH/CREDIT',
            "paid_amount": float(purchase_data.paid_amount),
            "gross_amount": float(gross_amount),
            "cgst_amount": float(cgst_amount),
            "sgst_amount": float(sgst_amount),
            "total_amount": float(total_amount),
            "rounded_amount": float(rounded_amount)
        }
        
        # Insert purchase (insert() already returns Response object, no need for .execute())
        purchase_result = supabase.table("purchases").insert(purchase_record)
        
        if not hasattr(purchase_result, 'data') or not purchase_result.data or len(purchase_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create purchase - no data returned"
            )
        
        purchase_id = purchase_result.data[0]["id"]
        
        # Create purchase items
        items_data = []
        for item in purchase_data.items:
            item_record = {
                "purchase_id": purchase_id,
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
            supabase.table("purchase_items").insert(items_data)
        
        # Fetch the complete purchase with items
        purchase_result = supabase.table("purchases").select("*").eq("id", purchase_id).execute()
        items_result = supabase.table("purchase_items").select("*").eq("purchase_id", purchase_id).execute()
        
        purchase = purchase_result.data[0]
        purchase["items"] = items_result.data if items_result.data else []
        
        return PurchaseResponse(**purchase)
        
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
            detail=f"Error creating purchase: {error_msg}"
        )


@router.get("/", response_model=List[PurchaseResponse])
async def get_all_purchases(
    from_date: str = None,
    to_date: str = None,
    supplier_id: int = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all purchases with optional filters"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        query = supabase.table("purchases").select("*")
        
        # Apply date filters - ensure dates are in correct format
        if from_date:
            # Ensure from_date is in YYYY-MM-DD format
            from_date_str = str(from_date).strip()
            if from_date_str:
                query = query.gte("purchase_date", from_date_str)
        if to_date:
            # Ensure to_date is in YYYY-MM-DD format and includes the full day
            to_date_str = str(to_date).strip()
            if to_date_str:
                query = query.lte("purchase_date", to_date_str)
        if supplier_id:
            query = query.eq("supplier_id", supplier_id)
        
        result = query.order("purchase_date", desc=True).execute()
        
        purchases = result.data if result.data else []
        
        # Fetch items for each purchase
        purchase_responses = []
        for purchase in purchases:
            items_result = supabase.table("purchase_items").select("*").eq("purchase_id", purchase["id"]).execute()
            purchase["items"] = items_result.data if items_result.data else []
            purchase_responses.append(PurchaseResponse(**purchase))
        
        return purchase_responses
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving purchases: {str(e)}"
        )


@router.get("/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(purchase_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a single purchase by ID"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        result = supabase.table("purchases").select("*").eq("id", purchase_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase with ID {purchase_id} not found"
            )
        
        purchase = result.data[0]
        
        # Fetch items
        items_result = supabase.table("purchase_items").select("*").eq("purchase_id", purchase_id).execute()
        purchase["items"] = items_result.data if items_result.data else []
        
        return PurchaseResponse(**purchase)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving purchase: {str(e)}"
        )


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase(purchase_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a purchase"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if purchase exists
        purchase_result = supabase.table("purchases").select("*").eq("id", purchase_id).execute()
        if not purchase_result.data or len(purchase_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Purchase with ID {purchase_id} not found"
            )
        
        # Delete purchase items first (foreign key constraint)
        supabase.table("purchase_items").delete().eq("purchase_id", purchase_id).execute()
        
        # Delete purchase
        supabase.table("purchases").delete().eq("id", purchase_id).execute()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting purchase: {str(e)}"
        )