"""User management routes (Admin only)"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from models.user import UserResponse
from routers.auth import SECRET_KEY, ALGORITHM
from jose import JWTError, jwt
from typing import List

router = APIRouter(prefix="/api/users", tags=["Users"])
security = HTTPBearer()


def get_current_user_role(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user's role from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        supabase = get_supabase_service()
        
        # Check admins table first
        admin_result = supabase.table("admins").select("username").eq("id", user_id).execute()
        if admin_result.data and len(admin_result.data) > 0:
            return {"role": "ADMIN", "username": admin_result.data[0].get("username")}
        
        # Check users table
        user_result = supabase.table("users").select("username").eq("id", user_id).execute()
        if user_result.data and len(user_result.data) > 0:
            return {"role": "USER", "username": user_result.data[0].get("username")}
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )


@router.get("/", response_model=List[UserResponse])
async def get_all_users(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all users (Admin only)"""
    try:
        # Check if current user is admin
        current_user_info = get_current_user_role(credentials)
        
        if current_user_info.get("role", "").upper() != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can access this endpoint"
            )
        
        supabase = get_supabase_service()
        
        # Get all users from both tables
        all_users = []
        
        # Get regular users
        users_result = supabase.table("users").select("*").execute()
        if users_result.data:
            for user in users_result.data:
                user.pop("password_hash", None)
                user["role"] = "USER"
                all_users.append(user)
        
        # Get admins
        admins_result = supabase.table("admins").select("*").execute()
        if admins_result.data:
            for admin in admins_result.data:
                admin.pop("password_hash", None)
                admin["role"] = "ADMIN"
                all_users.append(admin)
        
        # Convert to UserResponse models
        return [UserResponse(**user) for user in all_users]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving users: {str(e)}"
        )
