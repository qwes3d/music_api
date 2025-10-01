import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/conn.js";
import user from "../models/user.js";
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// POST /auth/register - Create new user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const database = db.getDb();
    const existing = await database.collection("users").findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      email,
      password: hashed,
      createdAt: new Date(),
    };

    await database.collection("users").insertOne(newUser);

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login - Login user and return JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const database = db.getDb();

    const user = await database.collection("users").findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/profile - Get user info (needs requireAuth middleware)
router.get("/profile", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({
    message: "Profile retrieved successfully",
    user: req.user,
  });
});

export default router;
