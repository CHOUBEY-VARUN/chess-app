export type AuthUser = {
  id: number;
  username: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};