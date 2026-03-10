"""Minimal Supabase client wrapper using httpx and gotrue"""
from postgrest import SyncRequestBuilder
from gotrue import SyncGoTrueClient
from typing import Any, Optional
import httpx


class TableQueryBuilder:
    """Query builder for table operations matching supabase-py API"""
    
    def __init__(self, client: httpx.Client, table_name: str, base_url: str, key: str):
        self.client = client
        self.table_name = table_name
        self.base_url = base_url
        self.key = key
        self._query_params: dict = {}
    
    def select(self, query: str = "*"):
        """Select columns"""
        self._query_params['select'] = query
        return self
    
    def eq(self, column: str, value: Any):
        """Filter by equality"""
        self._query_params[f'{column}'] = f'eq.{value}'
        return self
    
    def execute(self):
        """Execute the query"""
        url = f"{self.base_url}/rest/v1/{self.table_name}"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # Build query string
        params = {}
        if 'select' in self._query_params:
            params['select'] = self._query_params['select']
        
        # Add filters
        filter_params = {k: v for k, v in self._query_params.items() if k != 'select'}
        params.update(filter_params)
        
        response = self.client.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        # Return object that mimics supabase-py response
        class Response:
            def __init__(self, data):
                self.data = data
        return Response(response.json())


class TableClient:
    """Wrapper for table operations"""
    
    def __init__(self, client: 'SupabaseClient', table_name: str):
        self.client = client
        self.table_name = table_name
        self._http_client = httpx.Client()
    
    def select(self, query: str = "*"):
        """Create a select query"""
        builder = TableQueryBuilder(
            self._http_client,
            self.table_name,
            self.client.url,
            self.client.key
        )
        return builder.select(query)


class SupabaseClient:
    """Minimal Supabase client for database and auth operations"""
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        
        # Initialize GoTrue client for authentication
        self.auth = SyncGoTrueClient(
            url=f"{self.url}/auth/v1",
            auto_refresh_token=True,
            persist_session=True,
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}"
            }
        )
    
    def table(self, table_name: str) -> TableClient:
        """Get a table client for database operations"""
        return TableClient(self, table_name)
    
    def __call__(self):
        """Make client callable like supabase()"""
        return self


# For backward compatibility with supabase-py API
def create_client(url: str, key: str) -> SupabaseClient:
    """Create a Supabase client instance"""
    return SupabaseClient(url, key)
