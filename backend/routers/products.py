"""Products CRUD routes for batch-based lookup"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from models.product import ProductCreate, ProductUpdate, ProductResponse
from typing import List

router = APIRouter(prefix="/api/products", tags=["Products"])
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


@router.get("/batch/{batch_no}", response_model=ProductResponse)
async def get_product_by_batch(batch_no: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get product by batch number - for auto-fill functionality"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        result = supabase.table("products").select("*").eq("batch_no", batch_no).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with batch number '{batch_no}' not found"
            )
        
        return ProductResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving product: {str(e)}"
        )


@router.get("/", response_model=List[ProductResponse])
async def get_all_products(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all products"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        result = supabase.table("products").select("*").order("batch_no", desc=False).execute()
        
        products = result.data if result.data else []
        return [ProductResponse(**product) for product in products]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving products: {str(e)}"
        )


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product_data: ProductCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new product"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if batch_no already exists
        existing = supabase.table("products").select("*").eq("batch_no", product_data.batch_no).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with batch number '{product_data.batch_no}' already exists"
            )
        
        product_record = {
            "batch_no": product_data.batch_no.strip().upper(),
            "description": product_data.description.strip(),
            "hsn_sac": product_data.hsn_sac.strip() if product_data.hsn_sac else None,
            "expiry": product_data.expiry.isoformat() if product_data.expiry else None,
            "mrp": float(product_data.mrp),
            "default_rate": float(product_data.default_rate),
            "default_disc_percent": float(product_data.default_disc_percent),
            "default_gst_percent": float(product_data.default_gst_percent),
            "packing": product_data.packing.strip() if product_data.packing else None
        }
        
        result = supabase.table("products").insert(product_record)
        
        if not hasattr(result, 'data') or not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create product"
            )
        
        return ProductResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating product: {str(e)}"
        )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_data: ProductUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update a product"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if product exists
        existing = supabase.table("products").select("*").eq("id", product_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found"
            )
        
        update_data = {}
        if product_data.description is not None:
            update_data["description"] = product_data.description.strip()
        if product_data.hsn_sac is not None:
            update_data["hsn_sac"] = product_data.hsn_sac.strip() if product_data.hsn_sac else None
        if product_data.expiry is not None:
            update_data["expiry"] = product_data.expiry.isoformat() if product_data.expiry else None
        if product_data.mrp is not None:
            update_data["mrp"] = float(product_data.mrp)
        if product_data.default_rate is not None:
            update_data["default_rate"] = float(product_data.default_rate)
        if product_data.default_disc_percent is not None:
            update_data["default_disc_percent"] = float(product_data.default_disc_percent)
        if product_data.default_gst_percent is not None:
            update_data["default_gst_percent"] = float(product_data.default_gst_percent)
        if product_data.packing is not None:
            update_data["packing"] = product_data.packing.strip() if product_data.packing else None
        
        if not update_data:
            return ProductResponse(**existing.data[0])
        
        result = supabase.table("products").update(update_data).eq("id", product_id).execute()
        
        if not hasattr(result, 'data') or not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update product"
            )
        
        return ProductResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating product: {str(e)}"
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a product"""
    try:
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if product exists
        existing = supabase.table("products").select("*").eq("id", product_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found"
            )
        
        supabase.table("products").delete().eq("id", product_id).execute()
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting product: {str(e)}"
        )
