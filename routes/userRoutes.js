import express from "express";
import User from "../models/userModel.js";
const router = express.Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ
router.get("/", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

export default router;
