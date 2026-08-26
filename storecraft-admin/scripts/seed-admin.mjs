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

const ADMIN_USER = {
  name: "Homefy.pk",
  email: "admin@homefy.pk",
  password: "@Hasnain0007",
  role: "superadmin",
  status: "active",
};

const LEGACY_EMAILS = ["admin@example.com", "homefy.pk"];

async function seedAdmin() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const force = process.argv.includes("--force");
  const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 12);
  let existingUser = await User.findOne({ email: ADMIN_USER.email });

  if (!existingUser) {
    for (const legacy of LEGACY_EMAILS) {
      const legacyUser = await User.findOne({ email: legacy });
      if (legacyUser) {
        legacyUser.email = ADMIN_USER.email;
        existingUser = legacyUser;
        break;
      }
    }
  }

  if (existingUser) {
    // Always re-activate; --force also resets password to the seed default.
    existingUser.email = ADMIN_USER.email;
    existingUser.status = "active";
    existingUser.role = ADMIN_USER.role;
    existingUser.name = ADMIN_USER.name;
    if (force) existingUser.password = hashedPassword;
    await existingUser.save();
    console.log(
      force
        ? `Superadmin reset (active + password): ${ADMIN_USER.email}`
        : `Superadmin already exists — set active: ${ADMIN_USER.email}`
    );
    return;
  }

  await User.create({
    ...ADMIN_USER,
    password: hashedPassword,
  });

  console.log(`Superadmin created successfully: ${ADMIN_USER.email}`);
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
