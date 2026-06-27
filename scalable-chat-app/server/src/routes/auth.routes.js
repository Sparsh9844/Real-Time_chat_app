import { Router } from "express";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { User } from "../models/user.model.js";

const router = Router();

const signToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ message: "Username already taken" });
    }

    // Hash password here — no Mongoose middleware needed
    const hashedPassword = await bcryptjs.hash(password, 12);

    const user = await User.create({ username, password: hashedPassword });
    const token = signToken(user);

    return res.status(201).json({ token, username: user.username });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = signToken(user);
    return res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
