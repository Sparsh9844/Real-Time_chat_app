import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://real-time-chat-app-drab-eight.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Chat server is running");
});

// Auth endpoints (public)
app.use("/api/auth", authRoutes);

export default app;
