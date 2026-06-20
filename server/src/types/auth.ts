export type PublicUser = {
  id: number;
  username: string;
};

export type AuthTokenPayload = {
  userId: number;
  username: string;
};