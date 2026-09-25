/**
 * npm run social:test-post -- --id=<postId> [--live] [--force]
 *
 * Default: dry-run (logs exact Graph calls that WOULD be made).
 * --live: real publish (overrides SOCIAL_DRY_RUN for this process only).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

function parseArgs(argv) {
  const out = { id: "", live: false, force: false };
  for (const a of argv) {
    if (a === "--live") out.live = true;
    else if (a === "--force") out.force = true;
    else if (a.startsWith("--id=")) out.id = a.slice(5);
    else if (!a.startsWith("-") && mongoose.Types.ObjectId.isValid(a)) out.id = a;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.id || !mongoose.Types.ObjectId.isValid(args.id)) {
    console.error("Usage: npm run social:test-post -- --id=<MongoObjectId> [--live] [--force]");
    process.exit(1);
  }

  const { dbConnect } = await import("../lib/db.js");
  const SocialPost = (await import("../lib/models/SocialPost.model.js")).default;
  const { getSocialConfig } = await import("../lib/social/config.js");
  const { publishSocialPost } = await import("../lib/social/publisher.js");

  const dryRun = !args.live;
  if (args.live) {
    console.warn("[social:test-post] --live → REAL Graph API calls");
  } else {
    console.info("[social:test-post] dry-run → logging planned calls only");
  }

  const cfg = getSocialConfig();
  console.info("[social:test-post] env", {
    SOCIAL_DRY_RUN: cfg.dryRun,
    effectiveDryRun: dryRun,
    graphVersion: cfg.graphVersion,
    pageId: cfg.pageId,
    igUserId: cfg.igUserId,
    hasToken: Boolean(cfg.pageToken),
    publicBaseUrl: cfg.publicBaseUrl,
  });

  await dbConnect();
  const post = await SocialPost.findById(args.id);
  if (!post) {
    console.error("Post not found:", args.id);
    process.exit(1);
  }

  console.info("[social:test-post] post", {
    id: String(post._id),
    title: post.title,
    imageCount: (post.images || []).length,
    imageUrls: (post.images || []).map((i) => i.url),
    platforms: post.platforms,
    status: post.status,
  });

  const result = await publishSocialPost(post, { dryRun, force: args.force });

  console.info("\n=== GRAPH CALLS (planned or executed) ===");
  for (const p of result.planned || []) {
    console.info(JSON.stringify(p, null, 2));
  }
  console.info("\n=== RESULT ===");
  console.info(
    JSON.stringify(
      {
        success: result.success,
        dryRun: result.dryRun,
        halted: result.halted,
        status: result.status,
        facebook: {
          success: result.facebook?.success,
          skipped: result.facebook?.skipped,
          postId: result.facebook?.postId,
          url: result.facebook?.url,
          error: result.facebook?.error,
        },
        instagram: {
          success: result.instagram?.success,
          skipped: result.instagram?.skipped,
          mediaId: result.instagram?.mediaId,
          permalink: result.instagram?.permalink,
          error: result.instagram?.error,
        },
        warnings: result.warnings,
        error: result.error,
      },
      null,
      2
    )
  );

  await mongoose.disconnect().catch(() => {});
  process.exit(result.success || dryRun ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
