/**
 * auth.js — JWT token helpers for CostlyAI
 * Stores tokens in localStorage for client-side auth state.
 */

const TOKEN_KEY = "costlyai_token";
const REFRESH_TOKEN_KEY = "costlyai_refresh_token";

/** Store the JWT tokens */
export function setToken(token, refreshToken = null) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

/** Retrieve the JWT access token */
export function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/** Retrieve the refresh token */
export function getRefreshToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

/** Remove the JWT tokens (logout) */
export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/** Check if the user is logged in (token exists and not expired) */
export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Decode JWT payload (no signature verification — server does that).
 * Returns the payload object or null.
 */
export function decodeToken(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/** Get the logged-in user's display name from token payload */
export function getUser() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  return payload
    ? {
        name: payload.name || payload.sub || "User",
        email: payload.sub,
        role: payload.role || "user",
      }
    : null;
}

/** Make an authenticated API request with automatic token refresh */
export async function authFetch(url, options = {}) {
  const token = getToken();
  
  let response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // If 401, try to refresh token
  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://https://project-estimation-backend-fp5x.onrender.com";
        const refreshResponse = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setToken(data.access_token, data.refresh_token);
          
          // Retry original request with new token
          response = await fetch(url, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.access_token}`,
              ...options.headers,
            },
          });
        } else {
          // Refresh failed, clear tokens
          removeToken();
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        removeToken();
      }
    }
  }

  return response;
}
