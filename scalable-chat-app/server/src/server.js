import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { initializeSocket } from "./socket.js";

const PORT = 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

initializeSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});