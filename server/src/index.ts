import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { configureSocketServer } from "./sockets/socketServer";

const app = createApp();
const server = createServer(app);

configureSocketServer(server);

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
