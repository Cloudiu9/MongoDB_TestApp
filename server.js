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
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    // === Ensure indexes exist ===
    try {
      await SoftwareReview.collection.createIndex({ asin: 1 });
      await SoftwareReview.collection.createIndex({ rating: 1 });
      await SoftwareReview.collection.createIndex({ verified_purchase: 1 });
      await SoftwareReview.collection.createIndex({
        text: "text",
        title: "text",
      });
      console.log("⚙️ Indexes ensured successfully");
    } catch (idxErr) {
      console.error("⚠️ Failed to create indexes:", idxErr);
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- MAIN ROUTE: Paginated software reviews ---
app.get("/software", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(200, parseInt(req.query.limit || "50"));
    const skip = (page - 1) * limit;

    const filter = {};

    // Text search
    if (req.query.q) {
      filter.$or = [
        { text: { $regex: req.query.q, $options: "i" } },
        { title: { $regex: req.query.q, $options: "i" } },
      ];
    }

    // Min rating
    if (req.query.minRating) {
      filter.rating = { $gte: Number(req.query.minRating) };
    }

    // Verified only
    if (req.query.verified === "true") {
      filter.verified_purchase = true;
    }

    // Filter by year
    if (req.query.year) {
      const year = parseInt(req.query.year);
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year + 1}-01-01`);
      filter.timestamp = { $gte: start.getTime(), $lt: end.getTime() };
    }

    // Sorting
    const sortMap = {
      rating_desc: { rating: -1 },
      rating_asc: { rating: 1 },
      date_desc: { timestamp: -1 },
      date_asc: { timestamp: 1 },
    };
    const sortOption = sortMap[req.query.sort] || { _id: -1 };

    const [docs, total] = await Promise.all([
      SoftwareReview.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      SoftwareReview.countDocuments(filter),
    ]);

    res.json({ docs, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed" });
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
