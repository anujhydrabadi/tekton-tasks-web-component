// Authentication utilities for Facets integration

export function getAuthToken() {
  // In a real Facets environment, this would be provided by the parent context
  // For now, we'll check for common token sources
  
  // Check if running in Facets context (session token would be provided)
  if (window.facetsSession && window.facetsSession.token) {
    return window.facetsSession.token;
  }
  
  // Check localStorage (common pattern)
  const stored = localStorage.getItem('facets-auth-token') || 
                 localStorage.getItem('auth-token') ||
                 localStorage.getItem('token');
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.token || parsed.accessToken || stored;
    } catch {
      return stored;
    }
  }
  
  // Check for cookie-based auth
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'facets-token' || name === 'auth-token') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

export function getAuthHeaders() {
  const token = getAuthToken();
  
  if (!token) {
    console.warn('No authentication token found');
    return {};
  }
  
  // Common auth header patterns
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}
