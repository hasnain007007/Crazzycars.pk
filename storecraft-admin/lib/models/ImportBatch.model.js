/**
 * Records a weekly social import so the owner can undo unposted posts.
 */
import mongoose from "mongoose";

const importBatchSchema = new mongoose.Schema(
  {
    fileName: { type: String, default: "", trim: true },
    importId: { type: String, default: "", trim: true, index: true },
    weekStart: { type: Date, default: null },
    rows: { type: Number, default: 0 },
    createdPostIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SocialPost" }],
    errors: [
      {
        rowNo: Number,
        postCode: String,
        message: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    undoneAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.ImportBatch ||
  mongoose.model("ImportBatch", importBatchSchema);
