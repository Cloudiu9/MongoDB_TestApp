// models/softwareReviewModel.js
import mongoose from "mongoose";

const softwareReviewSchema = new mongoose.Schema(
  {
    rating: Number,
    title: String,
    text: String,
    images: Array,
    asin: String,
    parent_asin: String,
    user_id: String,
    timestamp: Number,
    helpful_vote: Number,
    verified_purchase: Boolean,
  },
  { collection: "SoftwareReviews" } // name of the collection in MongoDB
);

export default mongoose.model("SoftwareReview", softwareReviewSchema);
