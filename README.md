# Real-Time Chess Room

[![CI](https://github.com/CHOUBEY-VARUN/chess-app/actions/workflows/ci.yml/badge.svg)](https://github.com/CHOUBEY-VARUN/chess-app/actions/workflows/ci.yml) 
[![CodeQL](https://github.com/CHOUBEY-VARUN/chess-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/CHOUBEY-VARUN/chess-app/actions/workflows/codeql.yml) 

Full-stack multiplayer chess room app where authenticated users can create or join private rooms and play legal chess games in real time. 

The backend is authoritative for online gameplay. It validates room access, player color, turn order, square format, piece ownership, and legal chess moves before persisting game state and broadcasting updates through Socket.IO.


## Status

Deployed MVP. Core authentication, room creation/joining, real-time gameplay, rematch, and new-game flows are implemented.

## Live Demo

https://github.com/user-attachments/assets/7d1d1406-ba97-44a3-9010-4fa8fc21d772

- Frontend: https://chess-app-rho-beryl.vercel.app
- Backend health check: https://chess-app-5yff.onrender.com

## Important Free-Tier Note

Note: The backend is hosted on Render's free tier, so the first request may take a short time if the server has been inactive.

## Features

- Username/password registration and login with JWT authentication.
- Protected frontend routes for account, lobby, local game, and room pages.
- Private room creation with six-character room codes.
- Join-by-code room flow for a second authenticated player.
- Quick play flow that joins the oldest waiting room or creates a new one.
- Real-time online chess board updates through Socket.IO.
- Server-side room access checks, color checks, turn-order checks, and legal move validation with chess.js.
- PostgreSQL-backed persistence for users, rooms, game sessions, FEN state, last move, game result, and rematch requests.
- Post-game rematch flow where both players must agree and colors flip for the next game.
- New Game flow that closes the completed room, moves the requester to a new waiting room, and returns the opponent to the lobby.
- Local chess mode for authenticated users.
- SPA refresh support on Vercel through `client/vercel.json`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Chess UI | react-chessboard |
| Chess rules | chess.js |
| Backend | Node.js, Express, TypeScript |
| Real time | Socket.IO |
| Database | PostgreSQL, Neon |
| Auth | JWT, bcrypt |
| Deployment | Vercel frontend, Render backend, Neon database |

## Engineering Quality 

This project includes a GitHub Actions-based quality workflow to keep the frontend and backend production-ready. 
- CI workflow runs on pushes and pull requests to `main`.
- Frontend validation includes dependency installation, linting, TypeScript checking, and production build verification.
- Backend validation includes dependency installation, TypeScript checking, and production build verification.
- CodeQL security scanning is configured for JavaScript/TypeScript analysis.
- Dependency Review checks pull requests for vulnerable dependency changes.
- Dependabot is configured for weekly updates across frontend npm packages, backend npm packages, and GitHub Actions.
- Package installation uses `npm ci` in CI for clean, lockfile-based installs.

These workflows help catch broken builds, TypeScript errors, dependency issues, and security concerns before changes are merged.

## Architecture

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

Vercel hosts the static React/Vite frontend. Render runs the persistent Express + Socket.IO backend process. Neon stores users, rooms, game sessions, FEN positions, game results, and rematch metadata. The backend is the authority for online chess moves, so clients request moves and the server decides whether they are valid before broadcasting the updated state.

More detail is available in [docs/architecture.md](docs/architecture.md).

## How the Real-Time Chess Flow Works

1. A user registers or logs in and receives a JWT.
2. Protected pages verify the current user through `/api/auth/me`.
3. A player starts quick play or creates a waiting room through the room API.
4. A second authenticated player joins the room by code or through quick play.
5. The room becomes active and the frontend opens a Socket.IO connection with the JWT in the socket handshake.
6. The server verifies the socket token, checks room membership, and creates or loads the active game session.
7. When a player drags a piece, the client emits a move request with the room code, source square, target square, and promotion value.
8. The backend validates room access, player color, turn order, square format, piece ownership, and move legality with chess.js.
9. Valid moves update the persisted FEN and last-move data in PostgreSQL.
10. The server emits fresh game state to every connected socket in that room.
11. When the game ends, the backend persists the result and exposes rematch or new-game actions.

## How to Test the Live Demo

1. Open https://chess-app-rho-beryl.vercel.app in two browser windows, or in one normal window and one incognito/private window.
2. Register or log in as two different users.
3. In the first window, open the lobby and start quick play to create a waiting room.
4. Copy the room code from the room page.
5. In the second window, join the room with that code.
6. Make legal chess moves and confirm both boards update in real time.
7. If the first action is slow, wait briefly and retry. Render free-tier cold starts can delay the first request after inactivity.

## Screenshots

Existing screenshots are stored in [docs/screenshots](docs/screenshots). Recommended future screenshot naming and capture notes are listed in [docs/screenshots/README.md](docs/screenshots/README.md).

| Landing | Auth |
| --- | --- |
| ![Landing page](docs/screenshots/Landing-page-screenshot.png) | ![Login and register page](docs/screenshots/LoginRegister-page-screenshot.png) |

| Home | Lobby |
| --- | --- |
| ![Home page](docs/screenshots/Home-page-screenshot.png) | ![Lobby page](docs/screenshots/Lobby-page-screenshot.png) |

| Waiting room | Active game room |
| --- | --- |
| ![Waiting room page](docs/screenshots/WaitingRoom-page-screenshot.png) | ![Active room page](docs/screenshots/ActiveRoom-page-screenshot.png) |

| Login | Local game |
| --- | --- |
| ![Login page](docs/screenshots/Login-page-screenshot.png) | ![Local game page](docs/screenshots/LocalRoom-page-screenshot.png) |

## Local Setup

### Prerequisites

- Node.js and npm
- PostgreSQL database
- Git

### 1. Clone and Install

Install dependencies separately for the frontend and backend:

```bash
cd server
npm install
```

```bash
cd client
npm install
```

### 2. Configure Environment Variables

Create local env files from the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Update `server/.env` with your local PostgreSQL connection string and a long random JWT secret.

### 3. Apply the Database Schema

```bash
cd server
npm run db:setup
```

### 4. Run the Backend

```bash
cd server
npm run dev
```

The backend defaults to `http://localhost:3000`.

### 5. Run the Frontend

```bash
cd client
npm run dev
```

The frontend defaults to `http://localhost:5173`.

## Environment Variables

### Client

`client/.env.example`

```env
VITE_API_BASE_URL=http://localhost:3000
```

`VITE_API_BASE_URL` controls the REST API and Socket.IO backend base URL used by the frontend.

### Server

`server/.env.example`

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chess_app
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

| Variable | Purpose |
| --- | --- |
| `PORT` | Local or hosted backend port. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Secret used to sign and verify JWTs. |
| `CLIENT_URL` | Frontend origin used for Express CORS and Socket.IO CORS. |

Do not commit real `.env` files, production database URLs, or real JWT secrets.

## Database Setup

The database schema is defined in [server/db/schema.sql](server/db/schema.sql). It creates:

- `users` for registered accounts.
- `rooms` for room codes, assigned players, room status, and closure metadata.
- `game_sessions` for active and completed games, FEN state, last moves, results, winners, end reasons, and rematch requests.

Apply the schema locally:

```bash
cd server
npm run db:setup
```

For a hosted Neon database, set `DATABASE_URL` to the Neon connection string before running the same command.

## Local Validation

Before opening a pull request or deploying changes, run the same core checks locally.

## Frontend

```bash
cd client
npm run lint
npm run typecheck
npm run build
Backend
cd server
npm run lint
npm run typecheck
npm run build
```

The GitHub Actions CI workflow runs these checks automatically for both applications.


## Deployment Overview

- Frontend: Vercel project with root directory `client`, build command `npm run build`, output directory `dist`, and `VITE_API_BASE_URL=https://chess-app-5yff.onrender.com`.
- Backend: Render web service with root directory `server`, build command `npm install && npm run build`, start command `npm start`, and environment variables for `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`.
- Database: Neon PostgreSQL with schema from `server/db/schema.sql`.
- SPA routing: `client/vercel.json` rewrites all routes to `index.html`, so direct refreshes on protected routes work through React Router.
- Socket.IO: the backend should run as a persistent Node process, not as serverless functions.

Detailed deployment notes are in [docs/deployment.md](docs/deployment.md).

## Testing Strategy 

The project currently includes a documented manual testing strategy covering authentication, room creation, manual room joining, quick play, real-time chess gameplay, post-game rematch/new-game flows, frontend routing, and deployment smoke testing. 

The repository also includes CI validation through GitHub Actions. On pushes and pull requests, the workflow validates the frontend and backend with dependency installation, linting or TypeScript checks, and production builds. 

Automated product tests are planned as a future improvement. The highest-priority future tests are: 
- Backend API tests for authentication, room creation, room joining, rematch, and new-game behavior.
- Socket.IO integration tests for two-player room synchronization and move validation.
- Playwright end-to-end tests for the complete two-browser chess flow.

See [`TESTING.md`](./TESTING.md) for the full manual testing checklist and planned automated test roadmap.

## Known Limitations 
- No automated product test suite yet; current coverage is manual testing plus CI validation.
- No move history or captured-pieces panel yet. - No chess clocks or time controls yet.
- No resign or draw-offer flow yet. - Pawn promotion currently defaults to queen in the online game.
- Socket.IO presence is process-local; multi-instance scaling would need sticky sessions or a shared adapter such as Redis.
- Render's free tier can introduce cold-start latency after inactivity.

## Future Improvements 

- Add focused backend tests for auth, room joins, move validation, rematches, and new-game behavior.
- Add Socket.IO integration tests for two-player synchronization.
- Add Playwright end-to-end tests for login, room creation, joining, gameplay, rematch, and new-game flows.
- Add move history, captured pieces, and PGN export. - Add resign, draw offer, and promotion-piece selection.
- Add chess clocks and configurable time controls. - Add Redis-backed Socket.IO adapter support for horizontal scaling.
- Add stronger production hardening such as rate limiting, structured request logging, and centralized error handling.

## Resume Bullet

Built and deployed a full-stack real-time multiplayer chess app with React, TypeScript, Express, Socket.IO, PostgreSQL, and JWT authentication, supporting private rooms, protected routes, server-authoritative legal move validation, live board synchronization, rematch/new-game flows, and GitHub Actions CI with CodeQL and dependency checks.

## What I Learned / Technical Highlights

- Designed an authoritative backend flow for real-time chess so clients cannot bypass room membership, color assignment, turn order, or chess.js move validation.
- Used JWT authentication for both REST requests and Socket.IO handshakes.
- Modeled persistent multiplayer game state with PostgreSQL rooms and game sessions instead of keeping game progress only in memory.
- Used database transactions and row locking around room joins to avoid two players claiming the same waiting room.
- Coordinated REST APIs for room lifecycle with Socket.IO events for low-latency board synchronization.
- Deployed a full-stack TypeScript app across Vercel, Render, and Neon, including SPA routing and cross-origin configuration.
- Added GitHub Actions CI to validate both frontend and backend changes before merge. - Configured CodeQL and Dependency Review to surface security and dependency issues in pull requests. - Configured Dependabot for weekly dependency updates across client, server, and GitHub Actions.
