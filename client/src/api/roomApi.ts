import { API_BASE_URL } from "../config/api";

export type Room = {
  id: number;
  roomCode: string;
  hostUserId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CreateRoomResponse = {
  room: Room;
};

async function parseResponse<T>(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

export async function createRoom(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<CreateRoomResponse>(response);
}