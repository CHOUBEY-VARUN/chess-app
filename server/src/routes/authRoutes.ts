import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";
import { verifyToken } from "../middleware/verifyToken";
import { env } from "../config/env";

const router = Router();

type UserRow = {
  id: number;
  username: string;
  password: string;
};

function createToken(user: { id: number; username: string }) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
    },
    env.jwtSecret,
    {
      expiresIn: "1h",
    },
  );
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

router.post("/register", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }

  const normalizedUsername = normalizeUsername(username);

  if (!isValidUsername(normalizedUsername)) {
    res.status(400).json({
      message: "Username must be 3-20 characters and use only letters, numbers, or underscores",
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const existingUser = await pool.query<UserRow>(
    "SELECT id FROM users WHERE username = $1",
    [normalizedUsername],
  );

  if (existingUser.rows.length > 0) {
    res.status(409).json({ message: "Username is already taken" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (username, password)
      VALUES ($1, $2)
      RETURNING id, username, password
    `,
    [normalizedUsername, hashedPassword],
  );

  const user = result.rows[0];
  const token = createToken(user);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ message: "Username and password are required" });
    return;
  }

  const normalizedUsername = normalizeUsername(username);

  const result = await pool.query<UserRow>(
    "SELECT id, username, password FROM users WHERE username = $1",
    [normalizedUsername],
  );

  const user = result.rows[0];

  if (!user) {
    res.status(401).json({ message: "Invalid username or password" });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    res.status(401).json({ message: "Invalid username or password" });
    return;
  }

  const token = createToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  });
});

router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
