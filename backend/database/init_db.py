"""Initialize database with default user"""
from supabase import create_client
from config import settings
import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def init_database():
    """Initialize database with default user"""
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
        
        # Check if any users exist
        result = supabase.table("users").select("*").limit(1).execute()
        
        if not result.data or len(result.data) == 0:
            # No users exist - user should create account via signup page
            pass
        else:
            pass
            
    except Exception as e:
        print(f"[ERROR] Failed to initialize database: {str(e)}")

if __name__ == "__main__":
    init_database()
