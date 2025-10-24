import express from "express";
import Review from "../models/reviewModel.js";
const router = express.Router();

// Adăugare review
router.post("/", async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Vizualizare review-uri cu populare user + product
router.get("/", async (req, res) => {
  const reviews = await Review.find().populate("userId").populate("productId");
  res.json(reviews);
});

export default router;
