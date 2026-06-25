# Deployment

This project is deployed as three services:

- Frontend on Vercel
- Backend on Render
- PostgreSQL database on Neon

## Frontend: Vercel

Recommended Vercel settings:

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Framework preset | Vite |

Environment variable:

```env
VITE_API_BASE_URL=https://chess-app-5yff.onrender.com
```

`client/vercel.json` contains an SPA rewrite:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This lets React Router handle direct page refreshes such as `/lobby` and `/rooms/:roomCode`.

## Backend: Render

Recommended Render web service settings:

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Runtime | Node |

Required app environment variables:

```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=https://chess-app-rho-beryl.vercel.app
```

Optional hosted Node setting:

```env
NODE_ENV=production
```

The server code currently reads `PORT`, `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`. Render provides `PORT` automatically for web services.

## Database: Neon

Create a Neon PostgreSQL database and use its connection string as `DATABASE_URL`.

Schema location:

```txt
server/db/schema.sql
```

Apply the schema:

```bash
cd server
npm run db:setup
```

For a production database, run the same command with `DATABASE_URL` set to the Neon connection string. Do not commit the Neon URL to the repository.

## Socket.IO Notes

The Socket.IO backend should run as a persistent Node process. It should not be deployed as serverless functions because online chess rooms require persistent WebSocket connections.

If Render free-tier hosting has been inactive, the first request can be delayed by a cold start. This is expected for the current deployment tier.

## Production Smoke Test

1. Open the deployed frontend in two browser sessions.
2. Register or log in as two different users.
3. Start quick play in the first session.
4. Copy the room code.
5. Join from the second session.
6. Make legal moves from both boards.
7. Confirm both boards update in real time.
8. Finish a game or force a quick manual check of post-game behavior.
9. Confirm rematch and new-game actions still work.
