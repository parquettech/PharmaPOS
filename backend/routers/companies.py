"""Companies CRUD routes"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from models.company import CompanyCreate, CompanyUpdate, CompanyResponse
from datetime import datetime
from typing import List

router = APIRouter(prefix="/api/companies", tags=["Companies"])
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


@router.get("/", response_model=List[CompanyResponse])
async def get_all_companies(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all companies - available for both admin and regular users"""
    try:
        # Verify authentication (both admin and users can access)
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        result = supabase.table("companies").select("*").execute()
        
        companies = result.data if result.data else []
        return [CompanyResponse(**company) for company in companies]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving companies: {str(e)}"
        )


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a single company by ID - available for both admin and regular users"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        result = supabase.table("companies").select("*").eq("id", company_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        
        return CompanyResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving company: {str(e)}"
        )


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(company_data: CompanyCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new company - available for both admin and regular users"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if GSTIN already exists
        try:
            existing = supabase.table("companies").select("*").eq("gstin", company_data.gstin).execute()
            if existing.data and len(existing.data) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Company with GSTIN '{company_data.gstin}' already exists"
                )
        except HTTPException:
            raise
        except Exception:
            pass  # Continue if check fails (table might not exist yet)
        
        # Prepare company data for insert
        # Don't include created_at/updated_at - database defaults/triggers handle these
        new_company = {
            "name": company_data.name.strip(),
            "gstin": company_data.gstin.strip().upper(),
            "phone": company_data.phone.strip(),
            "type": (company_data.type or "GENERAL").strip(),
        }
        
        # Add optional fields only if provided
        if company_data.address and company_data.address.strip():
            new_company["address"] = company_data.address.strip()
        if company_data.dl_no and company_data.dl_no.strip():
            new_company["dl_no"] = company_data.dl_no.strip()
        if company_data.email and company_data.email.strip():
            new_company["email"] = company_data.email.strip()
        if company_data.state_code and company_data.state_code.strip():
            new_company["state_code"] = company_data.state_code.strip()
        if company_data.place_of_supply and company_data.place_of_supply.strip():
            new_company["place_of_supply"] = company_data.place_of_supply.strip()
        
        # Insert company
        result = supabase.table("companies").insert(new_company)
        
        # Verify response
        if not hasattr(result, 'data'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create company - invalid response from database. Please check if companies table exists in Supabase."
            )
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create company - database did not return created record. Please ensure companies table exists and has proper permissions in Supabase."
            )
        
        # Return the created company
        created_company = result.data[0]
        return CompanyResponse(**created_company)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Check for common error patterns
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Companies table not found in database. Please run the SQL schema script in Supabase to create the companies table."
            )
        if "already exists" in error_msg.lower() or "unique constraint" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company with GSTIN '{company_data.gstin}' already exists"
            )
        if "permission" in error_msg.lower() or "policy" in error_msg.lower() or "rls" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database permission error. Please ensure RLS policies are set up correctly for the companies table in Supabase."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating company: {error_msg}"
        )


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: int, company_data: CompanyUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update a company - available for both admin and regular users"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if company exists
        existing = supabase.table("companies").select("*").eq("id", company_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        
        # Check if GSTIN is being updated and if it conflicts with another company
        if company_data.gstin:
            gstin_check = supabase.table("companies").select("*").eq("gstin", company_data.gstin.strip().upper()).execute()
            if gstin_check.data:
                for existing_company in gstin_check.data:
                    if existing_company.get("id") != company_id:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Company with GSTIN '{company_data.gstin}' already exists"
                        )
        
        # Prepare update data (only include fields that are provided)
        # Don't include updated_at - trigger handles it automatically
        update_data = {}
        
        if company_data.name is not None:
            update_data["name"] = company_data.name.strip() if isinstance(company_data.name, str) else company_data.name
        if company_data.gstin is not None:
            update_data["gstin"] = company_data.gstin.strip().upper() if isinstance(company_data.gstin, str) else company_data.gstin
        if company_data.address is not None:
            update_data["address"] = company_data.address.strip() if isinstance(company_data.address, str) else company_data.address
        if company_data.phone is not None:
            update_data["phone"] = company_data.phone.strip() if isinstance(company_data.phone, str) else company_data.phone
        if company_data.type is not None:
            update_data["type"] = company_data.type.strip() if isinstance(company_data.type, str) else company_data.type
        if company_data.dl_no is not None:
            update_data["dl_no"] = company_data.dl_no.strip() if isinstance(company_data.dl_no, str) else company_data.dl_no
        if company_data.email is not None:
            update_data["email"] = company_data.email.strip() if isinstance(company_data.email, str) else company_data.email
        if company_data.state_code is not None:
            update_data["state_code"] = company_data.state_code.strip() if isinstance(company_data.state_code, str) else company_data.state_code
        if company_data.place_of_supply is not None:
            update_data["place_of_supply"] = company_data.place_of_supply.strip() if isinstance(company_data.place_of_supply, str) else company_data.place_of_supply
        
        # If no fields to update, return existing company
        if not update_data:
            return CompanyResponse(**existing.data[0])
        
        # Update company
        result = supabase.table("companies").update(update_data).eq("id", company_id).execute()
        
        if not hasattr(result, 'data'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update company - invalid response format from database"
            )
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update company - no data returned from database"
            )
        
        return CompanyResponse(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Companies table not found in database. Please run the SQL schema script in Supabase."
            )
        if "already exists" in error_msg.lower() or "unique constraint" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating company: {error_msg}"
        )


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(company_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a company - available for both admin and regular users"""
    try:
        # Verify authentication
        get_current_user_role(credentials)
        
        supabase = get_supabase_service()
        
        # Check if company exists first
        existing = supabase.table("companies").select("*").eq("id", company_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found"
            )
        
        # Delete company
        result = supabase.table("companies").delete().eq("id", company_id).execute()
        
        # Delete operations return 204 or empty data - both are valid
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Companies table not found in database. Please run the SQL schema script in Supabase."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting company: {error_msg}"
        )
