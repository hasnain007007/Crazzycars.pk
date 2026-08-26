/**
 * Seeds the default superadmin account in MongoDB if missing.
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

const ADMIN_EMAIL = "admin@crazzycars.pk";

function seedPassword() {
  const password = String(process.env.ADMIN_SEED_PASSWORD || "").trim();
  if (password.length < 12) {
    throw new Error(
      "ADMIN_SEED_PASSWORD must be set in .env.local (min 12 characters). Do not hardcode a password in this script."
    );
  }
  return password;
}

const LEGACY_EMAILS = ["admin@example.com", "crazzycars.pk"];

async function seedAdmin() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const force = process.argv.includes("--force");
  const hashedPassword = await bcrypt.hash(seedPassword(), 12);
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
    // Always re-activate; --force also resets password from ADMIN_SEED_PASSWORD.
    existingUser.email = ADMIN_EMAIL;
    existingUser.status = "active";
    existingUser.role = "superadmin";
    existingUser.name = "Crazzycars.pk";
    if (force) existingUser.password = hashedPassword;
    await existingUser.save();
    console.log(
      force
        ? `Superadmin reset (active + password): ${ADMIN_EMAIL}`
        : `Superadmin already exists — set active: ${ADMIN_EMAIL}`
    );
    return;
  }

  await User.create({
    name: "Crazzycars.pk",
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: "superadmin",
    status: "active",
  });

  console.log(`Superadmin created successfully: ${ADMIN_EMAIL}`);
}

seedAdmin()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to seed superadmin:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  });
