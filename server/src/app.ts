import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ message: "Backend running" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);

  return app;
}
