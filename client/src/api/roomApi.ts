import { API_BASE_URL } from "../config/api";

export type Room = {
  id: number;
  roomCode: string;
  hostUserId: number;
  hostUsername: string;
  opponentUserId: number | null;
  opponentUsername: string | null;
  status: "waiting" | "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

type CreateRoomResponse = {
  room: Room;
};

type RoomResponse = {
  room: Room;
};

type QuickPlayResponse = RoomResponse & {
  action: "created" | "joined";
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

export async function quickPlay(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/rooms/quick-play`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<QuickPlayResponse>(response);
}

export async function getRoomByCode(token: string, roomCode: string) {
  const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<RoomResponse>(response);
}
