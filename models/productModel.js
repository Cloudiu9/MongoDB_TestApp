import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: String,
    price: Number,
    inStock: {
      type: Boolean,
      default: true,
      set: function (v) {
        if (typeof v === "boolean") return v;
        const str = String(v).trim().toLowerCase();
        return str === "true" || str === "yes" || str === "1";
      },
    },
  },
  { strict: false }
);

export default mongoose.model("Product", productSchema);
