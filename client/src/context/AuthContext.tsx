import { createContext } from "react";
import type { AuthUser } from "../types/auth";

export const TOKEN_KEY = "chessroom_token";

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loginUser: (username: string, password: string) => Promise<void>;
  registerUser: (username: string, password: string) => Promise<void>;
  logoutUser: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);