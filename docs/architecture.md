# Architecture

Real-Time Chess Room uses a React/Vite frontend, an Express + Socket.IO backend, and a PostgreSQL database. The important architectural choice is that the backend is authoritative for online game state.

```txt
Browser
  |
  v
Vercel-hosted React/Vite frontend
  |
  | REST API + Socket.IO
  v
Render-hosted Express backend
  |
  | SQL queries
  v
Neon PostgreSQL database
```

## Frontend

The frontend lives in `client/` and is built with React, TypeScript, Vite, React Router, react-chessboard, and socket.io-client.

Key areas:

- `client/src/App.tsx` defines public and protected routes.
- `client/src/context/AuthProvider.tsx` stores the JWT in local storage and reloads the current user with `/api/auth/me`.
- `client/src/pages/Lobby.tsx` starts quick play and joins rooms by code.
- `client/src/pages/Room.tsx` loads room metadata and renders the online game once both players are assigned.
- `client/src/components/game/OnlineChessGame.tsx` connects to Socket.IO, renders the board, sends move requests, and handles post-game actions.
- `client/src/config/api.ts` reads `VITE_API_BASE_URL`.

## Backend

The backend lives in `server/` and is built with Express, TypeScript, Socket.IO, pg, bcrypt, jsonwebtoken, and chess.js.

Key areas:

- `server/src/app.ts` configures Express, CORS, JSON parsing, and REST routes.
- `server/src/routes/authRoutes.ts` handles register, login, and current-user lookup.
- `server/src/routes/roomRoutes.ts` handles quick play, room creation, join-by-code, and room lookup.
- `server/src/sockets/socketServer.ts` verifies JWTs during the Socket.IO handshake.
- `server/src/sockets/gameSocketHandler.ts` handles room joins, moves, rematches, and new-game events.
- `server/src/services/roomService.ts` owns room code generation, room access rules, quick-play matching, and room closure.
- `server/src/services/onlineGameService.ts` owns chess state, turn enforcement, legal move validation, persistence, results, rematches, and new-game behavior.

## Data Model

The schema is defined in `server/db/schema.sql`.

- `users` stores registered usernames and hashed passwords.
- `rooms` stores room codes, host/opponent user IDs, room status, closure reason, and timestamps.
- `game_sessions` stores the game number, player colors, status, FEN, last move, result, winner, end reason, rematch requests, and timestamps.

## Authoritative Move Flow

1. The client sends a Socket.IO `makeMove` event with room code, source square, target square, and optional promotion.
2. The backend loads the room and confirms the user belongs to it.
3. The backend checks the room is active and not closed.
4. The backend loads or creates the active game session.
5. The backend maps the user to white or black and checks turn order.
6. The backend checks square format, piece ownership, and move legality using chess.js.
7. Valid moves update the persisted FEN and last move in PostgreSQL.
8. Completed games persist result, winner, end reason, and room closure state.
9. The backend broadcasts updated game state to all sockets in the room.

## Scaling Notes

The current deployment assumes a single persistent backend process. Live socket membership is process-local, while game state is persisted in PostgreSQL. If the backend is scaled to multiple instances, Socket.IO should be configured with sticky sessions or a shared adapter such as Redis.
