/**
 * Singleton Social Auto-Poster settings (owner-editable).
 * Env SOCIAL_DRY_RUN=true still forces test mode (master switch).
 */
import mongoose from "mongoose";

const DEFAULT_FOOTER = `📲 WhatsApp: 0328 4010007
🚚 Cash on Delivery all over Pakistan
🛒 Order: {productUrl}
🌐 crazzycars.pk | FB / IG / TikTok: @crazzycars.pk`;

const socialSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    /** Owner Live/Test toggle. Ignored when env SOCIAL_DRY_RUN is true. */
    dryRun: { type: Boolean, default: true },
    defaultSlots: { type: [String], default: () => ["10:00", "18:00"] },
    defaultPlatforms: {
      facebook: { type: Boolean, default: true },
      instagram: { type: Boolean, default: true },
      tiktok: { type: Boolean, default: false },
    },
    footerText: { type: String, default: DEFAULT_FOOTER },
    alwaysHashtag: { type: String, default: "#crazzycarspk" },
    hashtagLimits: {
      ig: { type: Number, default: 30 },
      fb: { type: Number, default: 5 },
      tiktok: { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

export { DEFAULT_FOOTER };

socialSettingsSchema.statics.getOrCreate = async function getOrCreate() {
  let doc = await this.findOne({ key: "default" });
  if (!doc) {
    doc = await this.create({ key: "default" });
  }
  return doc;
};

export default mongoose.models.SocialSettings ||
  mongoose.model("SocialSettings", socialSettingsSchema);
