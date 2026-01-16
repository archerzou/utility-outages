__all__ = [
  'Client', 
  'ClientError', 
  'UpstreamServiceError',
  'get_spoofed_headers',
  'get_user_agents'
]

import httpx
import random
from functools import lru_cache
from typing import Dict, List, Any, Callable, Optional
from urllib.parse import urlparse

@lru_cache(maxsize=1)
def get_user_agents() -> List[str]:
    """Fetches and caches a list of user agent strings."""
    with httpx.Client() as client:
        response = client.get('https://jnrbsn.github.io/user-agents/user-agents.json')
        response.raise_for_status()
        return response.json()

def get_spoofed_headers(url: str, additional_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    """Generates a dictionary of browser-like headers for a given URL.

    Args:
        url: The full target URL, used to set Origin and Referer headers.
        additional_headers: Any extra headers to merge into the defaults.
    """
    if additional_headers is None:
        additional_headers = {}
    
    parsed_url = urlparse(url)
    origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    headers = {
        'User-Agent': random.choice(get_user_agents()),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Origin': origin,
        'Referer': f"{origin}/",
    }
  
    headers.update(additional_headers)
    return headers

class ClientError(Exception):
    """Base exception for errors raised by the Client."""
    pass

class UpstreamServiceError(ClientError):
    """Raised when an upstream service returns an HTTP error status (4xx or 5xx)."""
    def __init__(self, message, status_code):
        super().__init__(message)
        self.status_code = status_code

class Client:
    """Manages fetching and transforming data from a remote API source."""

    def __init__(
            self, 
            name: str, 
            host: str, 
            endpoints: Dict[str, Any], 
            region: Optional[str] = None, 
            default_transformer: Optional[Callable] = None, 
            default_headers: Optional[Dict[str, str]] = None,
            verify: bool = True
        ):
        """Initialises the client for a specific host.

        Args:
            name: The logical name of the client (e.g., 'aurora').
            host: The base hostname of the remote API (e.g., 'api.example.com').
            endpoints: A dictionary defining the endpoints for the client.
            default_transformer: A default function to transform responses for all endpoints.
            default_headers: Default headers to apply to all requests.
            verify: Whether to verify SSL certificates.
        """
        self.name = name
        self.host = host
        self.region = region
        self.client = httpx.AsyncClient(base_url=f"https://{self.host}", verify=verify)
        self.default_headers = default_headers or {}
        self.default_transformer = default_transformer
        self._endpoints: Dict[str, Dict[str, Any]] = {}
        for endpoint_name, config in endpoints.items():
            if isinstance(config, str):
                config = {'path': config}
            self.set_endpoint(endpoint_name, **config)

    def set_endpoint(
            self, 
            name: str,
            path: str,
            transformer: Optional[Callable] = None, 
            default_headers: Optional[Dict[str, str]] = None,
            method: Optional[str] = 'GET'
        ):
        """Registers a new logical endpoint for the client to dispatch.

        Args:
            name: The logical name to use for dispatching (e.g., 'outages').
            path: The actual URL path for the resource (e.g., '/api/v1/data').
            transformer: A function that accepts an httpx.Response and returns transformed data.
            default_headers: Specific headers to be used only for this endpoint.
            method: HTTP method to use (GET or POST).
        """
        self._endpoints[name] = {
            'path': path,
            'transformer': transformer or self.default_transformer or (lambda resp: resp.text),
            'headers': self.default_headers | (default_headers or {}),
            'method': method.upper()
        }

    async def dispatch(self, name: str, path_params: Optional[Dict[str, str]] = None, query_params: Optional[Dict[str, str]] = None, body: Optional[Dict[str, Any]] = None) -> Any:
        """Fetches and transforms data for a registered endpoint.

        Args:
            name: The logical name of the endpoint to dispatch.
            path_params: Values for dynamic parts of the path (e.g., {'id': 123} for '/items/:id').
            query_params: URL query parameters to be added to the request.
            body: Request body for POST requests.

        Returns:
            The data returned by the endpoint's transformer function.

        Raises:
            UpstreamServiceError: If the remote API returns a 4xx or 5xx status.
            ClientError: For any other request or configuration-related error.
        """
        endpoint = self._endpoints.get(name)
        if not endpoint:
            raise ClientError(f"Endpoint '{name}' not found.")

        resolved_path = endpoint['path']
        if path_params:
            for key, value in path_params.items():
                resolved_path = resolved_path.replace(f":{key}", str(value))
        
        full_url = f"https://{self.host}{resolved_path}"
        headers = get_spoofed_headers(full_url, endpoint['headers'])
        method = endpoint.get('method', 'GET')

        try:
            if method == 'POST':
                response = await self.client.post(resolved_path, params=query_params, json=body, headers=headers, follow_redirects=True)
            else:
                response = await self.client.get(resolved_path, params=query_params, headers=headers, follow_redirects=True)
            response.raise_for_status()
            return endpoint['transformer'](response)
        except httpx.HTTPStatusError as err:
            raise UpstreamServiceError(
                f"Upstream service for '{self.name}:{name}' returned error: {err.response.status_code}",
                status_code=err.response.status_code
            ) from err
        except Exception as err:
            raise ClientError(f"An unexpected error occurred while dispatching '{self.name}:{name}': {err}") from err
        
    async def __aiter__(self):
        for endpoint_name in self._endpoints:
            yield endpoint_name

