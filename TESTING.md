# Testing Strategy

This project currently uses a documented manual and planned automated testing strategy.  
The goal is to verify the main user flows of the Real-Time Chess Room application before deployment and future feature work.

## Current Testing Status

Automated tests are not yet fully configured.

At this stage, the project is tested through:

- Manual feature testing
- Browser-based end-to-end flow checks
- Backend API testing through direct requests
- Real-time multiplayer testing using two browser sessions
- Deployment smoke testing after Vercel/Render updates

Automated testing is planned as a future improvement once the core online gameplay and post-game lifecycle features are finalized.

---

## Areas Covered by Manual Testing

### 1. Authentication

Test cases:

- A new user can register successfully.
- A registered user can log in successfully.
- Invalid login credentials return an error.
- Protected routes redirect unauthenticated users.
- Authenticated users remain logged in after page refresh.
- `/api/auth/me` returns the current user when a valid token is provided.

Expected result:

The app should correctly protect private pages and only allow logged-in users to create or join rooms.

---

### 2. Lobby and Room Creation

Test cases:

- A logged-in user can open the lobby page.
- Clicking "Create Room" creates a new room in the database.
- The user is redirected to `/rooms/:roomCode`.
- Room codes are generated automatically.
- Room codes are unique.
- Users cannot create or join rooms without authentication.

Expected result:

The backend should store a valid room, and the frontend should navigate the user to the correct room page.

---

### 3. Manual Room Joining

Test cases:

- A user can join a waiting room by entering a valid room code.
- Invalid room codes show an error.
- A room should not allow more than two active players.
- The host and opponent are assigned correctly.
- The room status updates when the second player joins.

Expected result:

Only two players should be able to enter a playable room.

---

### 4. Real-Time Chess Gameplay

Test cases:

- Two logged-in users can join the same room from different browsers.
- Both users see the same board state.
- A legal move made by one player appears on the other player's screen.
- Illegal moves are rejected.
- Players can only move their own pieces.
- Turns alternate correctly.
- Check, checkmate, stalemate, draw, and game-over states are displayed correctly.
- Refreshing the room page restores the current game state if supported.
- Disconnecting and reconnecting does not break the active room.

Expected result:

The online chess game should stay synchronized between both players and enforce legal chess rules.

---

### 5. Post-Game Flow

Planned or current test cases:

- After a game ends, players should see post-game options.
- A rematch should reset the board in the same room.
- A rematch should flip player colors.
- Starting a new game should move the requesting player to a new room.
- The other player should return to the lobby or be shown that the old room is inactive.
- Old completed rooms should not remain incorrectly playable.

Expected result:

Players should be able to continue playing without logging out and logging back in.

---

### 6. Frontend Routing

Test cases:

- `/` loads the home page.
- `/login` loads the login page.
- `/register` loads the register page.
- `/lobby` is protected.
- `/rooms/:roomCode` is protected.
- Refreshing deployed frontend routes does not show a Vercel 404.
- Invalid routes show an appropriate fallback page if implemented.

Expected result:

All frontend routes should work both locally and after deployment.

---

### 7. Deployment Smoke Testing

After every deployment, verify:

- Frontend loads on Vercel.
- Backend health/API route responds on Render.
- CORS allows requests from the deployed frontend domain.
- Register/login works on production.
- Lobby page works on production.
- Room creation works on production.
- Two users can join and play from production.
- Refreshing a room URL does not cause a deployment-level 404.
- Environment variables are configured correctly.

Expected result:

The deployed app should behave the same as the local app.

---

## Suggested Future Automated Tests

### Backend Tests

Recommended tools:

- Vitest or Jest
- Supertest
- Test PostgreSQL database or mocked database layer

High-priority backend tests:

- Auth registration
- Auth login
- JWT-protected route access
- Room creation
- Room joining
- Invalid room code handling
- Full-room rejection
- Room status updates

---

### Socket.IO Integration Tests

High-priority real-time tests:

- Authenticated socket connection
- Joining a room
- Broadcasting game state
- Rejecting illegal moves
- Handling player disconnects
- Rematch request and acceptance
- New game flow after completed game

---

### Frontend Tests

Recommended tools:

- Vitest
- React Testing Library

High-priority frontend tests:

- Login form rendering
- Register form rendering
- Protected route behavior
- Lobby create-room button behavior
- Join-room form validation
- Game status display
- Post-game action buttons

---

### End-to-End Tests

Recommended tool:

- Playwright

High-priority E2E flows:

- Register two users
- Log in as both users
- Create a room
- Join room from second browser context
- Make a legal move
- Verify both boards update
- Complete or simulate game-over state
- Trigger rematch or new game flow

---

## Manual QA Checklist Before Deployment

Use this checklist before marking the project as deployment-ready:

- [ ] Register works locally
- [ ] Login works locally
- [ ] Protected routes work
- [ ] Create room works
- [ ] Join by room code works
- [ ] Third player is blocked
- [ ] Two-player real-time moves sync correctly
- [ ] Illegal moves are rejected
- [ ] Game-over states display correctly
- [ ] Rematch or new game flow works
- [ ] Frontend refresh works on deployed routes
- [ ] Production CORS is correctly configured
- [ ] Production database connection works
- [ ] No secrets are committed to GitHub
- [ ] README explains current testing status honestly

---

## Testing Philosophy

The most important flows in this project are the multiplayer flows.  
Because the core value of the app is real-time chess gameplay, testing should prioritize:

1. Authentication correctness
2. Room lifecycle correctness
3. Real-time board synchronization
4. Game rule enforcement
5. Post-game room cleanup and replay flow

Unit tests are useful, but integration and end-to-end tests will provide the most confidence for this project.
