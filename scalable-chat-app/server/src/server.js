import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { initializeSocket } from "./socket.js";
import { setupRedisAdapter } from "./config/redisAdapter.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
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
