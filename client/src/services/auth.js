/**
 * Authentication utilities for the RAG chatbot client
 */

/**
 * Get authentication token from localStorage or generate a temporary one
 * @returns {string|null} Authentication token
 */
export const getAuthToken = () => {
  // For development purposes, we'll use a simple token system
  // In production, this would integrate with a proper auth system
  let token = localStorage.getItem('auth_token');
  
  if (!token) {
    // Generate a simple session token for development
    token = `dev-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('auth_token', token);
  }
  
  return token;
};

/**
 * Set authentication token in localStorage
 * @param {string} token - Authentication token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Get authorization headers for API requests
 * @returns {Object} Headers object with authorization
 */
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
