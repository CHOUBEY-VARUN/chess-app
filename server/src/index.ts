import { createServer } from "node:http";
import dotenv from "dotenv";
import { createApp } from "./app";
import { configureSocketServer } from "./sockets/socketServer";

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const app = createApp();
const server = createServer(app);

configureSocketServer(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});