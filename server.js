import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import csv from "csvtojson";

// import models
import User from "./models/userModel.js";
import Product from "./models/productModel.js";
import Review from "./models/reviewModel.js";

// import routes
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();

// --- Middleware setup ---
app.use(express.json());
app.use(express.static("public")); // serves index.html and assets from /public

// --- MongoDB connection ---
mongoose
  .connect("mongodb://127.0.0.1:27017/reviewsDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Conectat la MongoDB"))
  .catch((err) => console.error("❌ Eroare conectare MongoDB:", err));

// --- Mount API routes ---
app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/reviews", reviewRoutes);

// --- CSV upload setup ---
const upload = multer({ dest: "uploads/" });

// helper: import a csv file into a model
async function importCSV(req, res, model) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    let jsonArray = await csv().fromFile(req.file.path);

    // Parse JSON strings in fields like "details" or "extra"
    jsonArray = jsonArray.map((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string" && value.trim().startsWith("{")) {
          try {
            obj[key] = JSON.parse(value); // convert to object
          } catch {
            /* ignore parse errors */
          }
        }
      }
      return obj;
    });

    const inserted = await model.insertMany(jsonArray);
    res.json({
      message: "CSV import successful",
      inserted: inserted.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "CSV import failed", details: err.message });
  }
}

// --- Optional GET to explain the endpoint ---
app.get("/upload-csv/:type", (req, res) => {
  res.send("Use POST with multipart/form-data to upload a CSV file.");
});

// --- POST endpoints for each collection ---
app.post("/upload-csv/users", upload.single("file"), (req, res) =>
  importCSV(req, res, User)
);

app.post("/upload-csv/products", upload.single("file"), (req, res) =>
  importCSV(req, res, Product)
);

app.post("/upload-csv/reviews", upload.single("file"), (req, res) =>
  importCSV(req, res, Review)
);

// --- CLEAR COLLECTIONS ---
app.delete("/clear/users", async (req, res) => {
  try {
    await User.deleteMany({});
    res.json({ message: "All users deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear users" });
  }
});

app.delete("/clear/products", async (req, res) => {
  try {
    await Product.deleteMany({});
    res.json({ message: "All products deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear products" });
  }
});

app.delete("/clear/reviews", async (req, res) => {
  try {
    await Review.deleteMany({});
    res.json({ message: "All reviews deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear reviews" });
  }
});

// --- Unified data fetch route for front-end ---
app.get("/data", async (req, res) => {
  const users = await User.find();
  const products = await Product.find();
  const reviews = await Review.find()
    .populate("userId", "name email")
    .populate("productId", "name category price");

  res.json({ users, products, reviews });
});

// --- Aggregation pipeline: find "critical" reviews that contain "dar" ---
app.get("/analysis/critical-reviews", async (req, res) => {
  try {
    const criticalReviews = await Review.find({
      comment: { $regex: "dar", $options: "i" },
    })
      .populate({
        path: "userId",
        model: "User",
        select: "name",
        strictPopulate: false,
      })
      .populate({
        path: "productId",
        model: "Product",
        select: "name",
        strictPopulate: false,
      })
      .select("comment")
      .lean();

    res.json({
      total: criticalReviews.length,
      reviews: criticalReviews.map((r) => ({
        comment: (r.comment || "").trim() || "[no comment text]",
        user: r.userId?.name || "Unknown",
        product: r.productId?.name || "Unknown",
      })),
    });
  } catch (err) {
    console.error("Aggregation error:", err);
    res.status(500).json({ error: "Aggregation failed." });
  }
});

// --- Start server ---
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server pornit pe http://localhost:${PORT}`)
);
