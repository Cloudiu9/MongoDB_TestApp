import express from "express";
import mongoose from "mongoose";
import SoftwareReview from "./models/softwareReviewModel.js";

const app = express();

app.use(express.json());
app.use(express.static("public")); // serves your dashboard

// --- MongoDB connection ---
mongoose
  .connect("mongodb://127.0.0.1:27017/SoftwareReviews", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- MAIN ROUTE: Paginated software reviews ---
app.get("/software", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "50"));
    const skip = (page - 1) * limit;

    // Filtering
    const query = {};
    if (req.query.q) {
      const regex = new RegExp(req.query.q, "i");
      query.$or = [{ title: regex }, { text: regex }];
    }
    if (req.query.minRating)
      query.rating = { $gte: Number(req.query.minRating) };

    const [docs, total] = await Promise.all([
      SoftwareReview.find(query).skip(skip).limit(limit).lean(),
      SoftwareReview.countDocuments(query),
    ]);

    res.json({ docs, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch software reviews." });
  }
});

// --- AGGREGATION: Quick stats ---
app.get("/agg/stats", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          verifiedCount: {
            $sum: { $cond: [{ $eq: ["$verified_purchase", true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          avgRating: { $round: ["$avgRating", 2] },
          totalReviews: 1,
          verifiedPercent: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$verifiedCount", "$totalReviews"] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ];

    const stats = await SoftwareReview.aggregate(pipeline);
    res.json(stats[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Aggregation failed." });
  }
});

// --- Aggregation: Distribution of ratings ---
app.get("/agg/ratings-distribution", async (req, res) => {
  try {
    const result = await SoftwareReview.aggregate([
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute ratings distribution." });
  }
});

// --- Aggregation: Reviews per year ---
app.get("/agg/reviews-per-year", async (req, res) => {
  try {
    const result = await SoftwareReview.aggregate([
      {
        $project: {
          year: {
            $year: {
              $toDate: "$timestamp",
            },
          },
        },
      },
      {
        $group: {
          _id: "$year",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute yearly distribution." });
  }
});

// --- Start server ---
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
