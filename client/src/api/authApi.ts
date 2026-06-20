import { API_BASE_URL } from "../config/api";
import type { AuthResponse, AuthUser } from "../types/auth";

type AuthCredentials = {
  username: string;
  password: string;
};

async function parseResponse<T>(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

export async function register(credentials: AuthCredentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return parseResponse<AuthResponse>(response);
}

export async function login(credentials: AuthCredentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return parseResponse<AuthResponse>(response);
}

export async function getMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ user: AuthUser }>(response);
}