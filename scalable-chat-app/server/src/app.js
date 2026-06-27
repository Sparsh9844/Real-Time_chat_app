import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Chat server is running");
});

// Auth endpoints (public)
app.use("/api/auth", authRoutes);

export default app;
