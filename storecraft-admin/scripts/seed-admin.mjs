/**
 * Seeds the superadmin account in MongoDB if missing.
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD from the environment — no hardcoded defaults.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../lib/models/User.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env.local");

dotenv.config({ path: envPath });

function requireAdminCreds() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!email) {
    throw new Error(
      "ADMIN_EMAIL is missing. Set it in the environment (or storecraft-admin/.env.local) before seeding."
    );
  }
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is missing. Set it in the environment (or storecraft-admin/.env.local) before seeding. Never hardcode a password."
    );
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }
  if (!email.includes("@")) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }
  return { email, password };
}

/** Optional migration targets only — never used as the new account email. */
const LEGACY_EMAILS = ["admin@example.com"];

async function seedAdmin() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  const { email: ADMIN_EMAIL, password } = requireAdminCreds();

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const force = process.argv.includes("--force");
  const hashedPassword = await bcrypt.hash(password, 12);
  let existingUser = await User.findOne({ email: ADMIN_EMAIL });

  if (!existingUser) {
    for (const legacy of LEGACY_EMAILS) {
      const legacyUser = await User.findOne({ email: legacy });
      if (legacyUser) {
        legacyUser.email = ADMIN_EMAIL;
        existingUser = legacyUser;
        break;
      }
    }
  }

  if (existingUser) {
    existingUser.email = ADMIN_EMAIL;
    existingUser.status = "active";
    existingUser.role = "superadmin";
    if (force) existingUser.password = hashedPassword;
    await existingUser.save();
    console.log(
      force
        ? `Superadmin reset (active + password) for ADMIN_EMAIL`
        : `Superadmin already exists — set active for ADMIN_EMAIL`
    );
    return;
  }

  await User.create({
    name: "Store Admin",
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: "superadmin",
    status: "active",
  });

  console.log("Superadmin created successfully for ADMIN_EMAIL");
}

seedAdmin()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to seed superadmin:", error.message);
    try {
      await mongoose.connection.close();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
