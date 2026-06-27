import dotenv from "dotenv";
dotenv.config(); // Must be first — before any other imports read process.env

import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { initializeSocket } from "./socket.js";
import { setupRedisAdapter } from "./config/redisAdapter.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 3001;

// Validate critical env vars on startup
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set in .env");
  process.exit(1);
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://real-time-chat-app-drab-eight.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connect MongoDB
await connectDB();

// Connect Socket.IO to Redis
await setupRedisAdapter(io);

// Register all socket events
initializeSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
