import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Add an apiRequest helper function to standardize API calls
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const defaultOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...options.headers,
    },
    credentials: 'include',
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers = {
      'Content-Type': 'application/json',
      ...defaultOptions.headers,
    };
  }

  // Merge the body if it exists
  if (options.body) {
    defaultOptions.body = options.body;
  }

  try {
    const response = await fetch(endpoint, defaultOptions);

    // Get response details for better error reporting
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      // Try to parse error as JSON if possible
      let errorData = {};
      try {
        if (isJson) {
          errorData = await response.json();
        } else {
          errorData = { message: await response.text() };
        }
      } catch (parseError) {
        console.error('Error parsing API error response:', parseError);
        errorData = { message: `HTTP error: ${response.status} ${response.statusText}` };
      }

      // Throw standardized error object
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.message || `HTTP error: ${response.status} ${response.statusText}`,
        isAuthError: response.status === 401 || response.status === 403,
        ...errorData,
      };
    }

    // For 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Parse JSON if content type is JSON
    if (isJson) {
      return response.json();
    }

    // Return text for other response types
    return { text: await response.text() };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error:', error);
      throw {
        status: 0,
        message: 'Network error: Unable to connect to the server',
        isNetworkError: true,
        originalError: error,
      };
    }

    // Re-throw already formatted errors
    throw error;
  }
}

import { QueryClient } from '@tanstack/react-query';

type UnauthorizedBehavior = "returnNull" | "throw";

// Properly handle cross-domain requests by ensuring correct paths
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, meta }) => {
    // Get the query path
    const path = queryKey[0] as string;

    // Log request for debugging on custom domains
    const isCustomDomain = meta?.customDomain || 
                          !window.location.hostname.includes('replit.app') && 
                          !window.location.hostname.includes('localhost');

    if (isCustomDomain) {
      console.log(`Custom domain API request: ${path}`);
    }

    try {
      const res = await fetch(path, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      // Handle 401 according to the specified behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Auth required for ${path}, returning null as configured`);
        return null;
      }

      // Special handling for 404 errors on image paths to provide better diagnostics
      if (res.status === 404 && path.includes('/images/')) {
        console.error(`Image not found: ${path}`);
        throw new Error(`Resource not found: ${path}`);
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        throw new Error(`HTTP error ${res.status}: ${errorText}`);
      }

      // Handle empty responses for certain endpoints like logout
      if (res.headers.get('content-length') === '0') {
        return null;
      }

      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      throw error;
    }
  };


let apiBaseUrl = '';

// Always use relative paths to stay on the same domain
// This ensures session cookies work properly across all domains
apiBaseUrl = '';

// Log the domain being used for debugging
if (import.meta.env.PROD) {
  console.log('API calls will be made to current domain:', window.location.hostname);
}

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2, // Increased retries to handle potential network issues
    },
    mutations: {
      retry: 1 // Add a retry for mutations as well
    }
  },
});

// Export the API base URL for use in fetch calls
export const getApiUrl = (path: string) => {
  // If path already starts with http, don't modify it
  if (path.startsWith('http')) return path;

  // Otherwise, prepend the base URL if necessary
  return `${apiBaseUrl}${path}`;
};