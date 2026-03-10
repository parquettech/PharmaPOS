"""Security service for enhanced authentication and authorization"""
from datetime import datetime, timedelta
from services.supabase_service import get_supabase_service
from typing import Optional, Dict, Any
import hashlib
import secrets
import re

# Security configuration
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_NUMBER = True
PASSWORD_REQUIRE_SPECIAL = False  # Can be enabled for stronger passwords
SESSION_TIMEOUT_MINUTES = 60 * 24 * 7  # 7 days


def hash_token(token: str) -> str:
    """Hash a JWT token for storage"""
    return hashlib.sha256(token.encode()).hexdigest()


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
    
    if PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if PASSWORD_REQUIRE_NUMBER and not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""


def check_account_lockout(username: str, is_admin: bool = False) -> tuple[bool, Optional[str]]:
    """Check if account is locked due to failed login attempts
    
    Returns:
        (is_locked, lockout_message)
    """
    try:
        supabase = get_supabase_service()
        table_name = "admins" if is_admin else "users"
        
        result = supabase.table(table_name).select("failed_login_count, locked_until").eq("username", username).execute()
        
        if not result.data or len(result.data) == 0:
            return False, None
        
        user = result.data[0]
        failed_count = user.get("failed_login_count", 0)
        locked_until = user.get("locked_until")
        
        # Check if account is currently locked
        if locked_until:
            lock_time = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
            if lock_time > datetime.utcnow():
                remaining = lock_time - datetime.utcnow()
                minutes = int(remaining.total_seconds() / 60)
                return True, f"Account is locked. Please try again in {minutes} minutes."
            else:
                # Lockout expired, reset
                supabase.table(table_name).update({
                    "failed_login_count": 0,
                    "locked_until": None
                }).eq("username", username).execute()
        
        # Check if we should lock the account
        if failed_count >= MAX_FAILED_ATTEMPTS:
            lockout_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            supabase.table(table_name).update({
                "locked_until": lockout_until.isoformat()
            }).eq("username", username).execute()
            return True, f"Account locked due to {MAX_FAILED_ATTEMPTS} failed login attempts. Please try again in {LOCKOUT_DURATION_MINUTES} minutes."
        
        return False, None
    except Exception as e:
        # If check fails, allow login attempt (fail open for availability)
        return False, None


def record_failed_login(username: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None, is_admin: bool = False):
    """Record a failed login attempt"""
    try:
        supabase = get_supabase_service()
        table_name = "admins" if is_admin else "users"
        
        # Get current failed count
        result = supabase.table(table_name).select("failed_login_count").eq("username", username).execute()
        current_count = 0
        if result.data and len(result.data) > 0:
            current_count = result.data[0].get("failed_login_count", 0)
        
        # Increment failed count
        new_count = current_count + 1
        update_data = {
            "failed_login_count": new_count,
            "last_failed_login": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Lock account if threshold reached
        if new_count >= MAX_FAILED_ATTEMPTS:
            lockout_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            update_data["locked_until"] = lockout_until.isoformat()
        
        supabase.table(table_name).update(update_data).eq("username", username).execute()
        
        # Log failed attempt
        supabase.table("failed_login_attempts").insert({
            "username": username,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "attempt_time": datetime.utcnow().isoformat()
        }).execute()
    except Exception:
        pass  # Don't fail if logging fails


def reset_failed_login_count(username: str, is_admin: bool = False):
    """Reset failed login count after successful login"""
    try:
        supabase = get_supabase_service()
        table_name = "admins" if is_admin else "users"
        
        supabase.table(table_name).update({
            "failed_login_count": 0,
            "locked_until": None,
            "last_failed_login": None,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("username", username).execute()
    except Exception:
        pass  # Don't fail if reset fails


def create_session(user_id: int, username: str, role: str, token: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> str:
    """Create a new user session"""
    try:
        supabase = get_supabase_service()
        token_hash = hash_token(token)
        expires_at = datetime.utcnow() + timedelta(minutes=SESSION_TIMEOUT_MINUTES)
        
        result = supabase.table("user_sessions").insert({
            "user_id": user_id,
            "username": username,
            "role": role,
            "token_hash": token_hash,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "is_active": True,
            "last_activity": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat()
        }).execute()
        
        if result.data and len(result.data) > 0:
            return str(result.data[0]["id"])
        return ""
    except Exception:
        return ""


def update_session_activity(session_id: str):
    """Update session last activity time"""
    try:
        supabase = get_supabase_service()
        supabase.table("user_sessions").update({
            "last_activity": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", session_id).execute()
    except Exception:
        pass


def invalidate_session(token: str):
    """Invalidate a session by token"""
    try:
        supabase = get_supabase_service()
        token_hash = hash_token(token)
        supabase.table("user_sessions").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("token_hash", token_hash).execute()
    except Exception:
        pass


def invalidate_all_user_sessions(user_id: int):
    """Invalidate all sessions for a user"""
    try:
        supabase = get_supabase_service()
        supabase.table("user_sessions").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id).execute()
    except Exception:
        pass


def log_audit_event(user_id: Optional[int], username: Optional[str], action: str, 
                   resource_type: Optional[str] = None, resource_id: Optional[int] = None,
                   ip_address: Optional[str] = None, user_agent: Optional[str] = None,
                   status: str = "SUCCESS", details: Optional[Dict[str, Any]] = None):
    """Log an audit event"""
    try:
        supabase = get_supabase_service()
        supabase.table("audit_logs").insert({
            "user_id": user_id,
            "username": username,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "status": status,
            "details": details or {},
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception:
        pass  # Don't fail if audit logging fails


def get_client_ip(request) -> Optional[str]:
    """Extract client IP address from request"""
    try:
        # Check for forwarded IP (if behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Check for real IP
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return None
    except Exception:
        return None


def get_user_agent(request) -> Optional[str]:
    """Extract user agent from request"""
    try:
        return request.headers.get("User-Agent")
    except Exception:
        return None
