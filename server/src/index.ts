import dotenv from "dotenv";
import { createApp } from "./app";

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
