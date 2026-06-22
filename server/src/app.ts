import cors from "cors";
import express, { type Express } from "express";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";

export function createApp(): Express {
  const app = express();
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  app.use(
    cors({
      origin: clientUrl,
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
