CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(6) NOT NULL UNIQUE,
  host_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS closed_reason VARCHAR(30)
    CHECK (
      closed_reason IS NULL
      OR closed_reason IN ('game_over', 'new_game', 'cancelled')
    );

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS closed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  white_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  black_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  fen TEXT NOT NULL,
  last_move JSONB,
  result VARCHAR(20)
    CHECK (result IS NULL OR result IN ('white_win', 'black_win', 'draw')),
  winner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ended_reason VARCHAR(30)
    CHECK (
      ended_reason IS NULL
      OR ended_reason IN (
        'checkmate',
        'stalemate',
        'insufficient_material',
        'threefold_repetition',
        'fifty_move_rule',
        'draw',
        'new_game',
        'abandoned'
      )
    ),
  white_rematch_requested_at TIMESTAMP,
  black_rematch_requested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  CONSTRAINT game_sessions_distinct_players CHECK (white_user_id <> black_user_id),
  CONSTRAINT game_sessions_room_game_number_unique UNIQUE (room_id, game_number)
);

CREATE INDEX IF NOT EXISTS rooms_status_created_at_idx
  ON rooms (status, created_at);

CREATE INDEX IF NOT EXISTS rooms_host_status_idx
  ON rooms (host_user_id, status);

CREATE INDEX IF NOT EXISTS rooms_opponent_status_idx
  ON rooms (opponent_user_id, status);

CREATE INDEX IF NOT EXISTS game_sessions_room_created_at_idx
  ON game_sessions (room_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_one_active_per_room_idx
  ON game_sessions (room_id)
  WHERE status = 'active';