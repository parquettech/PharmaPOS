"""Supabase service using direct HTTP requests"""
import httpx
from typing import Optional, Dict, Any, List
from config import settings


class SupabaseService:
    """Service for interacting with Supabase using direct HTTP requests"""
    
    def __init__(self):
        # Use service_role_key if available (for admin operations), otherwise use anon_key
        # Handle empty strings properly
        key = settings.supabase_service_role_key if settings.supabase_service_role_key else settings.supabase_anon_key
        
        if not settings.supabase_url or settings.supabase_url.strip() == "":
            raise ValueError("SUPABASE_URL is not configured. Please set it in .env file.")
        if not key or (isinstance(key, str) and key.strip() == ""):
            raise ValueError("SUPABASE_ANON_KEY is not configured. Please set it in .env file.")
        
        # Fix URL if it's a dashboard URL - convert to API URL
        supabase_url = settings.supabase_url.rstrip('/')
        if 'dashboard/project/' in supabase_url:
            # Extract project ref from dashboard URL: https://supabase.com/dashboard/project/{ref}
            project_ref = supabase_url.split('dashboard/project/')[-1].split('/')[0].split('?')[0]
            supabase_url = f"https://{project_ref}.supabase.co"
        elif not supabase_url.endswith('.supabase.co'):
            # If URL doesn't end with .supabase.co, try to fix it
            if 'project/' in supabase_url:
                project_ref = supabase_url.split('project/')[-1].split('/')[0].split('?')[0]
                supabase_url = f"https://{project_ref}.supabase.co"
        
        self.base_url = f"{supabase_url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        # Use shorter timeout to prevent hanging - 5 seconds should be enough for most queries
        self.client = httpx.Client(timeout=5.0)
    
    def _get_headers(self, additional_headers: Optional[Dict] = None):
        """Get headers with optional additional headers"""
        headers = self.headers.copy()
        if additional_headers:
            headers.update(additional_headers)
        return headers
    
    def select(self, table: str, filters: Optional[Dict] = None, columns: str = "*", order_column: Optional[str] = None, order_direction: str = "asc", limit: Optional[int] = None):
        """Select data from a table"""
        url = f"{self.base_url}/{table}"
        params = {"select": columns}
        
        # Add filters
        if filters:
            for key, value in filters.items():
                if key.endswith('.gte'):
                    # Greater than or equal
                    column = key.replace('.gte', '')
                    params[column] = f"gte.{value}"
                elif key.endswith('.lte'):
                    # Less than or equal
                    column = key.replace('.lte', '')
                    params[column] = f"lte.{value}"
                else:
                    # Equality filter
                    params[key] = f"eq.{value}"
        
        # Add ordering if specified
        if order_column:
            order_param = f"{order_column}.{order_direction}"
            params["order"] = order_param
        
        # Add limit if specified
        if limit is not None:
            params["limit"] = str(limit)
        
        try:
            response = self.client.get(url, headers=self._get_headers(), params=params, timeout=5.0)
            response.raise_for_status()
            result = response.json()
            # Supabase PostgREST returns a list directly, wrap it in a dict with 'data' key
            if isinstance(result, list):
                return {"data": result}
            # If it's already a dict, check if it has 'data' key
            elif isinstance(result, dict) and "data" in result:
                return result  # Already has 'data' key, return as is
            # Otherwise, wrap single result or empty list
            else:
                return {"data": [result] if result else []}
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            status_code = e.response.status_code if hasattr(e.response, 'status_code') else None
            raise Exception(f"Supabase error (status {status_code}): {error_text}")
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to Supabase: {str(e)}")
        except Exception as e:
            raise Exception(f"Error querying Supabase: {str(e)}")
    
    def insert(self, table: str, data: Dict[str, Any] | List[Dict[str, Any]]):
        """Insert data into a table - always returns dict with 'data' key"""
        url = f"{self.base_url}/{table}"
        
        try:
            response = self.client.post(
                url,
                headers=self._get_headers(),
                json=data,
                timeout=5.0
            )
            response.raise_for_status()
            result = response.json()
            # Supabase returns array with return=representation (Prefer: return=representation header)
            if isinstance(result, list):
                return {"data": result}
            elif isinstance(result, dict):
                # If result is already a dict, check if it has 'data' key or wrap it
                if "data" in result:
                    return result
                elif result:  # Non-empty dict
                    return {"data": [result]}
                else:  # Empty dict
                    return {"data": []}
            else:
                return {"data": []}
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            status_code = e.response.status_code if hasattr(e.response, 'status_code') else None
            # Parse error text if it's JSON
            try:
                error_json = e.response.json() if hasattr(e.response, 'json') else {}
                if isinstance(error_json, dict) and 'message' in error_json:
                    error_text = error_json['message']
                elif isinstance(error_json, dict) and 'detail' in error_json:
                    error_text = error_json['detail']
            except:
                pass
            raise Exception(f"Supabase error (status {status_code}): {error_text}")
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to Supabase: {str(e)}")
        except Exception as e:
            # Re-raise if it's already our custom exception
            if "Supabase error" in str(e) or "Network error" in str(e):
                raise
            raise Exception(f"Error inserting into Supabase: {str(e)}")
    
    def update(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]):
        """Update data in a table"""
        url = f"{self.base_url}/{table}"
        params = {}
        
        # Build filter params - Supabase PostgREST format
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        try:
            response = self.client.patch(
                url,
                headers=self._get_headers(),
                json=data,
                params=params,
                timeout=5.0
            )
            response.raise_for_status()
            result = response.json()
            if isinstance(result, list):
                return {"data": result}
            elif isinstance(result, dict):
                return {"data": [result]} if result else {"data": []}
            return {"data": []}
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            status_code = e.response.status_code if hasattr(e.response, 'status_code') else None
            raise Exception(f"Supabase error (status {status_code}): {error_text}")
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to Supabase: {str(e)}")
        except Exception as e:
            raise Exception(f"Error updating Supabase: {str(e)}")
    
    def delete(self, table: str, filters: Dict[str, Any]):
        """Delete data from a table"""
        url = f"{self.base_url}/{table}"
        params = {}
        
        # Build filter params - Supabase PostgREST format
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        try:
            response = self.client.delete(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=5.0
            )
            response.raise_for_status()
            # Delete operations return 204 or the deleted data
            if response.status_code == 204:
                return {"data": []}
            try:
                result = response.json()
                return {"data": result if isinstance(result, list) else [result] if result else []}
            except:
                return {"data": []}
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else str(e)
            status_code = e.response.status_code if hasattr(e.response, 'status_code') else None
            raise Exception(f"Supabase error (status {status_code}): {error_text}")
        except httpx.RequestError as e:
            raise Exception(f"Network error connecting to Supabase: {str(e)}")
        except Exception as e:
            raise Exception(f"Error deleting from Supabase: {str(e)}")
    
    def table(self, table_name: str):
        """Return a table client (for compatibility with supabase-py API)"""
        class Table:
            def __init__(self, service: SupabaseService, name: str):
                self.service = service
                self.name = name
            
            def select(self, columns: str = "*"):
                class QueryBuilder:
                    def __init__(self, service: SupabaseService, table: str, columns: str):
                        self.service = service
                        self.table = table
                        self.columns = columns
                        self.filters = {}
                        self.order_column = None
                        self.order_direction = "asc"
                        self.limit_count = None
                    
                    def eq(self, column: str, value: Any):
                        self.filters[column] = value
                        return self
                    
                    def gte(self, column: str, value: Any):
                        """Greater than or equal filter"""
                        self.filters[f"{column}.gte"] = value
                        return self
                    
                    def lte(self, column: str, value: Any):
                        """Less than or equal filter"""
                        self.filters[f"{column}.lte"] = value
                        return self
                    
                    def order(self, column: str, desc: bool = False):
                        """Set ordering for the query"""
                        self.order_column = column
                        self.order_direction = "desc" if desc else "asc"
                        return self
                    
                    def limit(self, count: int):
                        """Set limit for the query"""
                        self.limit_count = count
                        return self
                    
                    def execute(self):
                        result = self.service.select(
                            self.table, 
                            self.filters, 
                            self.columns, 
                            self.order_column, 
                            self.order_direction,
                            self.limit_count
                        )
                        # Return an object with .data attribute to match supabase-py API
                        class Response:
                            def __init__(self, data_dict):
                                self.data = data_dict.get("data", [])
                        return Response(result)
                
                return QueryBuilder(self.service, self.name, columns)
            
            def insert(self, data: Dict | List[Dict]):
                """Insert data - always returns Response object with .data attribute"""
                class Response:
                    def __init__(self, data_dict):
                        # Ensure data_dict is always a dict with 'data' key
                        if isinstance(data_dict, dict):
                            self.data = data_dict.get("data", [])
                        elif isinstance(data_dict, list):
                            self.data = data_dict
                        else:
                            self.data = []
                
                # Call the service insert method - it will raise Exception on error
                # It always returns a dict with 'data' key on success
                if isinstance(data, list):
                    result = self.service.insert(self.name, data)
                else:
                    result = self.service.insert(self.name, data)
                
                # Result should always be a dict with 'data' key (or exception was raised)
                # But handle edge cases just in case
                if not isinstance(result, dict):
                    # This shouldn't happen, but handle it
                    raise Exception(f"Unexpected insert result type: {type(result)}")
                
                # Always wrap in Response object
                return Response(result)
            
            def update(self, data: Dict):
                class UpdateBuilder:
                    def __init__(self, service: SupabaseService, table: str, data: Dict):
                        self.service = service
                        self.table = table
                        self.data = data
                        self.filters = {}
                    
                    def eq(self, column: str, value: Any):
                        self.filters[column] = value
                        return self
                    
                    def execute(self):
                        result = self.service.update(self.table, self.data, self.filters)
                        # Return an object with .data attribute to match supabase-py API
                        class Response:
                            def __init__(self, data_dict):
                                self.data = data_dict.get("data", [])
                        return Response(result)
                
                return UpdateBuilder(self.service, self.name, data)
            
            def delete(self):
                class DeleteBuilder:
                    def __init__(self, service: SupabaseService, table: str):
                        self.service = service
                        self.table = table
                        self.filters = {}
                    
                    def eq(self, column: str, value: Any):
                        self.filters[column] = value
                        return self
                    
                    def execute(self):
                        result = self.service.delete(self.table, self.filters)
                        # Return an object with .data attribute to match supabase-py API
                        class Response:
                            def __init__(self, data_dict):
                                self.data = data_dict.get("data", [])
                        return Response(result)
                
                return DeleteBuilder(self.service, self.name)
        
        return Table(self, table_name)


# Global instance - lazy initialization to avoid errors if .env is not configured
_supabase_service_instance = None

def get_supabase_service():
    """Get or create Supabase service instance (lazy initialization)"""
    global _supabase_service_instance
    if _supabase_service_instance is None:
        try:
            _supabase_service_instance = SupabaseService()
        except ValueError as e:
            # Re-raise with helpful message
            raise ValueError(
                f"{str(e)}\n"
                "Please configure your .env file with Supabase credentials.\n"
                "See server/env.example.txt for the required format."
            )
    return _supabase_service_instance

# For backward compatibility - use get_supabase_service() function
# Note: Import with: from services.supabase_service import get_supabase_service
# Then use: supabase = get_supabase_service()

# Create a client-like interface
def create_client(url: str, key: str):
    """Create Supabase client (for compatibility)"""
    return supabase_service
