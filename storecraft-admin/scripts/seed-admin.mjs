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
  name: "Crazzycars.pk",
  email: "admin@example.com",
  password: "ChangeMe@123",
  role: "superadmin",
  status: "active",
};

async function seedAdmin() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env.local");
  }

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });

  const existingUser = await User.findOne({ email: ADMIN_USER.email });
  if (existingUser) {
    console.log(`Superadmin already exists: ${ADMIN_USER.email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 12);

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
