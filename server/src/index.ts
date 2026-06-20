import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app = express();

const port = Number(process.env.PORT) || 3000;
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});