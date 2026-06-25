# ChessRoom

Full-stack real-time chess room app built with React, Express, Socket.IO, PostgreSQL, and chess.js.

## Features

- Username/password auth with JWT
- Private room codes
- Quick play matchmaking
- Real-time legal chess moves
- Persisted game sessions and game-over state
- Post-game rematches that require both players to agree
- Rematches stay in the same room and flip colors
- New Game flow that closes the old room, moves the requester to a new room, and returns the opponent to the lobby

## Project Structure

- `client/` - React + Vite frontend
- `server/` - Express + Socket.IO backend
- `server/db/schema.sql` - PostgreSQL schema
- `server/scripts/applySchema.js` - schema setup script

## Local Setup

### 1. Database

Create a PostgreSQL database, then configure `server/.env`.

```bash
cd server
npm install
npm run db:setup
```

### 2. Backend

```bash
cd server
npm run dev
```

The backend defaults to `http://localhost:3000`.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

The frontend defaults to `http://localhost:5173`.

## Environment Variables

### Server

Create `server/.env` from `server/.env.example`.

- `PORT` - backend port, usually `3000` locally
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - long random JWT signing secret
- `CLIENT_URL` - frontend origin for CORS and Socket.IO

### Client

Create `client/.env` from `client/.env.example`.

- `VITE_API_BASE_URL` - deployed or local backend URL

## Database Setup

Apply the schema locally:

```bash
cd server
npm run db:setup
```

Apply the schema to a hosted database:

```bash
cd server
DATABASE_URL="postgresql://user:password@host/db" npm run db:setup
```

PowerShell:

```powershell
cd server
$env:DATABASE_URL="postgresql://user:password@host/db"
npm run db:setup
```

## Deployment

### Database

Use hosted PostgreSQL such as Neon, Supabase, Railway Postgres, or Render Postgres.

Run `npm run db:setup` once against the production database before starting the backend.

### Backend

Use persistent Node hosting such as Render, Railway, or Fly.io.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Set these environment variables in the hosting dashboard:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`

### Frontend

Use Vercel or Netlify.

Build command:

```bash
npm install && npm run build
```

Publish directory:

```txt
dist
```

Set `VITE_API_BASE_URL` to the deployed backend URL.

## Socket.IO Deployment Notes

The backend should run as a persistent Node process. Do not deploy the Socket.IO backend as serverless functions.

Game sessions and results are stored in PostgreSQL. Live socket presence is still process-local. If the backend is scaled to multiple instances, use sticky sessions or add a Socket.IO adapter such as Redis.

## Validation

Backend:

```bash
cd server
npm run typecheck
npm run build
```

Frontend:

```bash
cd client
npm run lint
npm run build
```

Manual smoke test:

1. User A creates or quick-plays a room.
2. User B joins.
3. Play until checkmate/draw/stalemate.
4. Confirm both users see post-game actions.
5. Both users request rematch.
6. Confirm colors flip in the same room.
7. Finish another game.
8. User A clicks New game.
9. Confirm User A moves to a new room.
10. Confirm User B returns to the lobby.
11. Confirm old room no longer accepts moves.

## Known MVP Limitations

- No automated test suite yet
- No move history panel yet
- No resign or draw-offer flow yet
- Promotion currently defaults to queen
- No rate limiting yet
- Multi-instance Socket.IO scaling needs sticky sessions or a shared adapter
