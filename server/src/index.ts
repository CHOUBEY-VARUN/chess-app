import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const port = Number(process.env.PORT) || 3000;

app.get("/", (req, res) => {
  res.json({ message: "Backend running" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
