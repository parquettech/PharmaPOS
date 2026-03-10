import sys
import io
import asyncio
import logging

# Fix Windows console encoding to handle emojis and special characters
if sys.platform == 'win32':
    # Set stdout and stderr to UTF-8
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    # Suppress harmless ConnectionResetError from asyncio on Windows
    # These occur when browsers close connections unexpectedly (e.g., CORS preflight)
    # Configure logging to filter out ConnectionResetError
    logging.getLogger('asyncio').setLevel(logging.ERROR)
    
    # Custom logging filter to suppress ConnectionResetError
    class ConnectionResetFilter(logging.Filter):
        def filter(self, record):
            # Suppress ConnectionResetError messages
            if record.exc_info:
                exc_type = record.exc_info[0]
                if exc_type == ConnectionResetError:
                    return False
            if 'ConnectionResetError' in str(record.getMessage()):
                return False
            if 'WinError 10054' in str(record.getMessage()):
                return False
            return True
    
    # Apply filter to asyncio logger
    asyncio_logger = logging.getLogger('asyncio')
    asyncio_logger.addFilter(ConnectionResetFilter())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, users, companies, stock, purchases, sales, products

app = FastAPI(
    title="PharmaPOS API",
    description="Pharmacy Point of Sale System API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(stock.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(products.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "FastAPI server is running",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if Supabase is configured
        if settings.supabase_url and settings.supabase_anon_key:
            # Try to actually connect to Supabase (with shorter timeout)
            try:
                from services.supabase_service import get_supabase_service
                supabase = get_supabase_service()
                
                # Quick test - just try to reach Supabase API endpoint (don't query tables)
                import httpx
                # Extract base URL without /rest/v1
                base_url = supabase.base_url.replace('/rest/v1', '')
                test_url = f"{base_url}/rest/v1/"
                
                # Use a very short timeout for health check
                test_client = httpx.Client(timeout=2.0)
                test_response = test_client.get(test_url, headers=supabase.headers)
                test_client.close()
                
                # If we get here, Supabase is reachable
                return {
                    "status": "healthy",
                    "database": "configured",
                    "supabase": "connected",
                    "environment": settings.environment,
                    "message": "Backend and database are operational"
                }
            except httpx.TimeoutException:
                # Show masked Supabase URL for debugging
                masked_url = settings.supabase_url
                if '.supabase.co' in masked_url:
                    parts = masked_url.split('.supabase.co')
                    masked_url = parts[0][:8] + '...' + '.supabase.co'
                
                return {
                    "status": "degraded",
                    "database": "configured",
                    "supabase": "timeout",
                    "error": "Supabase connection timed out after 2 seconds",
                    "supabase_url_masked": masked_url,
                    "environment": settings.environment,
                    "message": "Backend is running but cannot connect to Supabase",
                    "known_issue": "If you are in India, this may be due to ISP DNS blocking. See workarounds below.",
                    "workarounds": [
                        "1. Change DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8)",
                        "2. Use a VPN service",
                        "3. Use Supabase Custom Domain feature",
                        "4. Contact your ISP to report the issue"
                    ],
                    "dns_instructions": "Windows: Settings > Network > Change adapter options > Right-click your connection > Properties > IPv4 > Use custom DNS: 1.1.1.1"
                }
            except Exception as db_error:
                error_msg = str(db_error)
                return {
                    "status": "degraded",
                    "database": "configured",
                    "supabase": "not_connected",
                    "error": error_msg,
                    "environment": settings.environment,
                    "message": "Backend is running but Supabase connection failed. Check your .env file configuration."
                }
        else:
            return {
                "status": "healthy",
                "database": "not_configured",
                "supabase": "not_configured",
                "message": "Backend is running but Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env file.",
                "environment": settings.environment
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Backend health check failed"
        }


# Example route structure for future endpoints
# @app.get("/api/products")
# async def get_products():
#     try:
#         response = supabase.table("products").select("*").execute()
#         return response.data
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
