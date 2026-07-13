// src/lib/api/auth.ts
// Use NEXT_PUBLIC_BACKEND_URL consistently across the app
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export interface LoginResponse {
  accessToken: string;
  user: {
    userId: string;
    email: string;
    role: string;
    displayName: string | null;
  };
}

export interface RegisterResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
}

/**
 * Login with email/password. Backend sets HttpOnly refreshToken cookie.
 * credentials:"include" is required so the browser sends/stores cookies.
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // ← required for HttpOnly cookie to be set
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ErrorResponse).error || "An error occurred during login."
    );
  }

  return data as LoginResponse;
}

/**
 * Register a new account.
 */
export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ErrorResponse).error || "An error occurred during registration."
    );
  }

  return data as RegisterResponse;
}

/**
 * Logout – revokes the session on backend and clears the refresh token cookie.
 */
export async function logout(accessToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  } catch {
    // Best-effort; always clear client-side state regardless
  }
}

/**
 * Refresh access token using the HttpOnly refresh token cookie.
 * Returns new accessToken or throws if the session is invalid.
 */
export async function refreshAccessToken(
  expiredAccessToken: string
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${expiredAccessToken}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as ErrorResponse).error || "Session expired. Please log in again."
    );
  }

  return data.accessToken as string;
}
