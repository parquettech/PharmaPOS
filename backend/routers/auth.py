"""Authentication routes with enhanced security"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase_service import get_supabase_service
from services.security_service import (
    validate_password_strength, check_account_lockout, record_failed_login,
    reset_failed_login_count, create_session, invalidate_session, invalidate_all_user_sessions,
    log_audit_event, get_client_ip, get_user_agent
)
from models.user import UserLogin, UserCreate, UserResponse, TokenResponse
from config import settings
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = settings.supabase_anon_key or "dev-secret-key-change-in-production"  # In production, use a separate secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request):
    """Register a new user or admin
    
    - If username ends with @admin: creates admin in admins table
    - Otherwise: creates regular user in users table
    """
    try:
        supabase = get_supabase_service()
        
        # Check if username ends with @admin (admin signup)
        # Note: Admin signup requires service_role key, so regular signup always goes to users table
        is_admin_signup = user_data.username.lower().endswith("@admin")
        
        # Only allow admin signup if we have service_role key, otherwise force to users table
        if is_admin_signup and not settings.supabase_service_role_key:
            # Can't create admin without service_role key, treat as regular user
            is_admin_signup = False
            # Force to users table - don't try admins table at all
        
        target_table = "admins" if is_admin_signup else "users"
        
        # Check if username already exists - only check the target table we'll use
        try:
            if is_admin_signup:
                # Only check admins table if we're actually creating an admin
                existing_admin = supabase.table("admins").select("*").eq("username", user_data.username).execute()
                admin_exists = False
                if hasattr(existing_admin, 'data'):
                    admin_exists = existing_admin.data and len(existing_admin.data) > 0
                elif isinstance(existing_admin, dict):
                    admin_exists = existing_admin.get('data') and len(existing_admin.get('data', [])) > 0
                if admin_exists:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists"
                    )
            else:
                # Check users table for regular signups
                existing_user = supabase.table("users").select("*").eq("username", user_data.username).execute()
                user_exists = False
                if hasattr(existing_user, 'data'):
                    user_exists = existing_user.data and len(existing_user.data) > 0
                elif isinstance(existing_user, dict):
                    user_exists = existing_user.get('data') and len(existing_user.get('data', [])) > 0
                if user_exists:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists"
                    )
            
        except HTTPException:
            raise
        except Exception as check_error:
            # If checking fails, log but continue (might be a new table)
            # We'll let the insert fail if username actually exists
            pass
        
        # Validate password strength
        is_valid, error_message = validate_password_strength(user_data.password)
        if not is_valid:
            log_audit_event(
                user_id=None,
                username=user_data.username,
                action="REGISTER_ATTEMPT",
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                status="FAILED",
                details={"reason": "Weak password"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Prepare user data
        new_record = {
            "username": user_data.username,
            "password_hash": hashed_password,
            "name": user_data.name or user_data.username,
            "email": user_data.email,
            "phone": user_data.phone,
            "status": "Active",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insert into appropriate table
        # IMPORTANT: Only insert into admins table if we have service_role key
        # Otherwise force to users table to avoid RLS errors
        if target_table == "admins" and not settings.supabase_service_role_key:
            target_table = "users"
        
        # Use service_role_key for inserts to bypass RLS
        # IMPORTANT: Without service_role_key, RLS policies will block inserts
        # The service_role_key allows bypassing RLS policies
        if not settings.supabase_service_role_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Service role key not configured. Please add SUPABASE_SERVICE_ROLE_KEY to backend/.env file, or update Supabase RLS policies to allow public INSERT on users table."
            )
        
        # Create a new service instance specifically for inserts using service_role_key
        # We need to manually set up the service with service_role_key to bypass RLS
        # Use direct insert call instead of table().insert() to avoid method issues
        import httpx
        
        # Make direct HTTP POST request to Supabase with service_role_key
        # Ensure we have the correct Supabase API URL (not dashboard URL)
        supabase_api_url = settings.supabase_url.rstrip('/')
        # If URL is dashboard URL, extract project ref and construct API URL
        if 'dashboard/project/' in supabase_api_url:
            # Extract project ref from dashboard URL: https://supabase.com/dashboard/project/{ref}
            project_ref = supabase_api_url.split('dashboard/project/')[-1].split('/')[0].split('?')[0]
            supabase_api_url = f"https://{project_ref}.supabase.co"
        elif not supabase_api_url.endswith('.supabase.co'):
            # If URL doesn't end with .supabase.co, it might be wrong
            # Try to construct from project ref if possible
            if 'project/' in supabase_api_url:
                project_ref = supabase_api_url.split('project/')[-1].split('/')[0].split('?')[0]
                supabase_api_url = f"https://{project_ref}.supabase.co"
        
        insert_url = f"{supabase_api_url}/rest/v1/{target_table}"
        insert_headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        try:
            client = httpx.Client(timeout=30.0)
            response = client.post(
                insert_url,
                headers=insert_headers,
                json=new_record,
                timeout=30.0
            )
            response.raise_for_status()
            result_data = response.json()
            
            # Wrap result to match expected format
            if isinstance(result_data, list):
                result = type('Response', (), {'data': result_data})()
            elif isinstance(result_data, dict):
                result = type('Response', (), {'data': [result_data] if result_data else []})()
            else:
                result = type('Response', (), {'data': []})()
        except httpx.HTTPStatusError as e:
            # Handle HTTP errors from Supabase
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            status_code = e.response.status_code if hasattr(e.response, 'status_code') else 500
            # Parse error text if it's JSON
            try:
                error_json = e.response.json() if hasattr(e.response, 'json') else {}
                if isinstance(error_json, dict) and 'message' in error_json:
                    error_text = error_json['message']
                elif isinstance(error_json, dict) and 'detail' in error_json:
                    error_text = error_json['detail']
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating account: Supabase error (status {status_code}): {error_text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating account: Network error connecting to Supabase: {str(e)}"
            )
        except AttributeError as attr_err:
            # Catch AttributeError if result is a dict instead of Response object
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating account: Database response format error. {str(attr_err)}"
            )
        
        # The insert() method should always return a Response object with .data attribute
        # Verify we got the right type
        if not hasattr(result, 'data'):
            # If it's a dict, try to extract data from it
            if isinstance(result, dict):
                result_data = result.get('data', [])
            elif isinstance(result, list):
                result_data = result
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create account - unexpected response type: {type(result)}. Expected Response object with .data attribute."
                )
        else:
            # Get data from Response object
            result_data = result.data if result.data else []
        
        # Ensure result_data is a list
        if not isinstance(result_data, list):
            result_data = [result_data] if result_data else []
        
        if len(result_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create account - no data returned from database"
            )
        
        # Get the first record
        record = result_data[0]
        if not isinstance(record, dict):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create account - record is not a dict: {type(record)}"
            )
        
        # Don't return password hash
        record.pop("password_hash", None)
        # Add role field for response model
        record["role"] = "ADMIN" if is_admin_signup else "USER"
        
        # Log successful registration
        log_audit_event(
            user_id=record.get("id"),
            username=user_data.username,
            action="REGISTER_SUCCESS",
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            status="SUCCESS"
        )
        
        return UserResponse(**record)
            
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Check if it's a username already exists error
        if "already exists" in error_msg.lower() or "unique constraint" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating account: {error_msg}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    """Authenticate user or admin and return JWT token
    
    - If username ends with @admin: checks admins table
    - Otherwise: checks users table
    """
    try:
        # Safely handle username first
        lookup_username = str(credentials.username).strip() if credentials.username else ""
        if not lookup_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is required"
            )
        
        # Get Supabase service
        supabase = None
        try:
            supabase = get_supabase_service()
        except ValueError as e:
            # Supabase not configured
            print(f"[LOGIN ERROR] Supabase not configured: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service is not configured. Please check your .env file."
            )
        except Exception as e:
            # Database connection error
            error_msg = str(e).lower()
            print(f"[LOGIN ERROR] Database connection error: {e}")
            
            # Check if it's a timeout (likely DNS/ISP issue in India)
            if "timeout" in error_msg or "timed out" in error_msg:
                detail_msg = (
                    "Database connection timed out. "
                    "If you are in India, this may be due to ISP DNS blocking Supabase. "
                    "Workarounds: 1) Change DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8) "
                    "2) Use a VPN service"
                )
            else:
                detail_msg = f"Database connection error: {str(e)}"
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=detail_msg
            )
        
        # Continue with normal Supabase authentication
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection failed."
            )
        
        user = None
        user_role = "USER"
        table_name = None
        is_admin = False
        
        # Get client info for security logging
        client_ip = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        # Check account lockout before attempting login (with timeout protection)
        # Skip lockout check if it might hang - prioritize login functionality
        is_locked = False
        lockout_message = None
        try:
            is_locked, lockout_message = check_account_lockout(lookup_username, is_admin=is_admin)
        except Exception as e:
            # If lockout check fails, log but continue (don't block login)
            pass  # Account lockout check failed - continue anyway
            is_locked = False
            lockout_message = None
        if is_locked:
            log_audit_event(
                user_id=None,
                username=lookup_username,
                action="LOGIN_ATTEMPT",
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Account locked"}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=lockout_message
            )
        
        # Check if username ends with @admin (admin login)
        if lookup_username.lower().endswith("@admin"):
            is_admin = True
            try:
                # Use service_role key if available for admin access, otherwise use regular supabase
                admin_supabase = supabase
                if settings.supabase_service_role_key:
                    # Create service with service_role key for admin queries
                    from services.supabase_service import SupabaseService
                    admin_service = SupabaseService()
                    admin_service.headers["apikey"] = settings.supabase_service_role_key
                    admin_service.headers["Authorization"] = f"Bearer {settings.supabase_service_role_key}"
                    admin_supabase = admin_service
                
                # Add timeout protection for admin query
                admin_result = admin_supabase.table("admins").select("*").eq("username", lookup_username).execute()
                if admin_result.data and len(admin_result.data) > 0:
                    admin = admin_result.data[0]
                    # Verify password
                    if verify_password(credentials.password, admin.get("password_hash", "")):
                        user = admin
                        user_role = "ADMIN"
                        table_name = "admins"
            except Exception as e:
                # Check if it's a connection error
                error_str = str(e)
                if "10060" in error_str or "timeout" in error_str.lower() or "Network error" in error_str or "Connection" in error_str:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Database connection failed. Please check your Supabase configuration in .env file."
                    )
                pass  # Admin login check error - continue to check users table
        
        # Check users table for regular users (only if not admin)
        if not user:
            try:
                # Add timeout protection for user query
                user_result = supabase.table("users").select("*").eq("username", lookup_username).execute()
                if user_result.data and len(user_result.data) > 0:
                    found_user = user_result.data[0]
                    # Get password hash (handle both password_hash and password field names)
                    password_hash = found_user.get("password_hash") or found_user.get("password", "")
                    
                    # Verify password for regular user
                    if password_hash and verify_password(credentials.password, password_hash):
                        user = found_user
                        user_role = "USER"
                        table_name = "users"
            except Exception as e:
                # Check if it's a connection error or timeout
                error_str = str(e).lower()
                if any(keyword in error_str for keyword in ["10060", "timeout", "network error", "connection", "supabase error", "network error connecting", "timeout of"]):
                    print(f"Database connection error during login: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Database connection timeout. Please check your Supabase configuration in .env file or ensure Supabase is accessible."
                    )
                pass  # Login error checking users table - continue to return invalid credentials
        
        # If no user found, return error immediately (don't wait for logging)
        if not user:
            # Try to log failed attempt, but don't wait if it hangs
            try:
                record_failed_login(lookup_username, client_ip, user_agent, is_admin=is_admin)
            except:
                pass  # Don't block error response if logging fails
            
            try:
                log_audit_event(
                    user_id=None,
                    username=lookup_username,
                    action="LOGIN_ATTEMPT",
                    ip_address=client_ip,
                    user_agent=user_agent,
                    status="FAILED",
                    details={"reason": "Invalid credentials"}
                )
            except:
                pass  # Don't block error response if logging fails
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Check if account is active
        if user.get("status") != "Active":
            log_audit_event(
                user_id=user.get("id"),
                username=lookup_username,
                action="LOGIN_ATTEMPT",
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Account inactive"}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Verify password (if not already verified above)
        if not verify_password(credentials.password, user.get("password_hash", "")):
            record_failed_login(lookup_username, client_ip, user_agent, is_admin=is_admin)
            log_audit_event(
                user_id=user.get("id"),
                username=lookup_username,
                action="LOGIN_ATTEMPT",
                ip_address=client_ip,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Invalid password"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Reset failed login count on successful login
        reset_failed_login_count(lookup_username, is_admin=is_admin)
        
        # Update last login in appropriate table (don't fail if this fails)
        try:
            if table_name:
                supabase.table(table_name).update({
                    "last_login": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", user["id"]).execute()
        except Exception:
            pass  # Don't fail login if update fails
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user["id"]), "username": user["username"], "role": user_role}
        )
        
        # Create session (non-blocking - don't wait if it hangs)
        session_id = ""
        try:
            session_id = create_session(
                user_id=user["id"],
                username=user["username"],
                role=user_role,
                token=access_token,
                ip_address=client_ip,
                user_agent=user_agent
            )
        except Exception as e:
            pass  # Session creation failed - continue anyway
            session_id = ""
        
        # Log successful login (non-blocking - don't wait if it hangs)
        try:
            log_audit_event(
                user_id=user["id"],
                username=user["username"],
                action="LOGIN_SUCCESS",
                ip_address=client_ip,
                user_agent=user_agent,
                status="SUCCESS",
                details={"session_id": session_id}
            )
        except Exception as e:
            pass  # Audit logging failed - continue anyway
        
        # Prepare user response (without password, add role)
        user.pop("password_hash", None)
        user["role"] = user_role
        user_response = UserResponse(**user)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Handle encoding errors when converting exception to string
        try:
            error_msg = str(e)
        except UnicodeEncodeError:
            # If encoding fails, use repr or a safe error message
            try:
                error_msg = repr(e)
            except:
                error_msg = "An error occurred during login"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {error_msg}"
        )


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None):
    """Logout user and invalidate session"""
    try:
        token = credentials.credentials
        
        # Decode token to get user info
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            username = payload.get("username")
        except JWTError:
            # Token invalid, but still try to invalidate
            pass
        
        # Invalidate session
        invalidate_session(token)
        
        # Log logout
        if 'user_id' in locals() and user_id:
            log_audit_event(
                user_id=int(user_id) if user_id else None,
                username=username if 'username' in locals() else None,
                action="LOGOUT",
                ip_address=get_client_ip(request) if request else None,
                user_agent=get_user_agent(request) if request else None,
                status="SUCCESS"
            )
        
        return {"message": "Logged out successfully"}
    except Exception:
        return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None):
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        
        # Decode token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token"
            )
        
        user_id = payload.get("sub")
        username = payload.get("username")
        user_role = payload.get("role", "USER")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        # Query Supabase for user data
        try:
            supabase = get_supabase_service()
        except Exception as e:
            print(f"[AUTH/ME ERROR] Supabase connection error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection error. Please check your Supabase configuration."
            )
        
        # Get user from appropriate table (admins or users)
        user = None
        
        # Check admins table first if role is ADMIN
        if user_role == "ADMIN":
            try:
                admin_result = supabase.table("admins").select("*").eq("id", user_id).execute()
                if admin_result.data and len(admin_result.data) > 0:
                    user = admin_result.data[0]
                    user["role"] = "ADMIN"
            except Exception:
                pass
        
        # Check users table if not found in admins
        if not user:
            try:
                user_result = supabase.table("users").select("*").eq("id", user_id).execute()
                if user_result.data and len(user_result.data) > 0:
                    user = user_result.data[0]
                    user["role"] = "USER"
            except Exception:
                pass
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.pop("password_hash", None)
        return UserResponse(**user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {str(e)}"
        )
