import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env";
import { registerGameSocketHandlers } from "../sockets/gameSocketHandler";
import type { AuthTokenPayload } from "../types/auth";
import type {
  AuthenticatedSocket,
  AuthenticatedSocketData,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "../types/socket";

function getHandshakeToken(socket: AuthenticatedSocket) {
  const auth = socket.handshake.auth as { token?: unknown };
  return typeof auth.token === "string" ? auth.token : null;
}

export function configureSocketServer(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    AuthenticatedSocketData
  >(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.use((socket, next) => {
    const token = getHandshakeToken(socket);

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    try {
      const decoded = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;

      socket.data.user = {
        id: decoded.userId,
        username: decoded.username,
      };

      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    registerGameSocketHandlers(io, socket);
  });

  return io;
}
