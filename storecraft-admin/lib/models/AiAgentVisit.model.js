/**
 * AI crawler / AI-referrer visit log.
 * Same collection as storecraft-store AiAgentVisit — proxy traffic only, not sales attribution.
 */
import mongoose from "mongoose";

const aiAgentVisitSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, trim: true, maxlength: 500, index: true },
    source: {
      type: String,
      required: true,
      trim: true,
      index: true,
      enum: [
        "chatgpt",
        "copilot",
        "perplexity",
        "claude",
        "gemini",
        "grok",
        "meta",
        "deepseek",
        "you",
        "google_extended",
        "bing",
        "apple",
        "amazon",
        "bytespider",
        "other_ai",
      ],
    },
    detection: {
      type: String,
      enum: ["user_agent", "referrer", "utm"],
      required: true,
    },
    userAgent: { type: String, default: "", maxlength: 400 },
    referrer: { type: String, default: "", maxlength: 1000 },
    /** Only when the AI referrer URL actually includes a query param — often empty. */
    referrerQuery: { type: String, default: "", maxlength: 500 },
    method: { type: String, default: "GET", maxlength: 10 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiAgentVisitSchema.index({ createdAt: -1 });
aiAgentVisitSchema.index({ source: 1, createdAt: -1 });

export default mongoose.models.AiAgentVisit || mongoose.model("AiAgentVisit", aiAgentVisitSchema);
