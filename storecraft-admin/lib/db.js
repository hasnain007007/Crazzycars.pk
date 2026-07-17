/**
 * MongoDB connection singleton for Next.js server runtime.
 */
import mongoose from "mongoose";
import "./registerModels";

const globalWithMongoose = globalThis;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}

if (!globalWithMongoose.__mongooseConnection) {
  globalWithMongoose.__mongooseConnection = { conn: null, promise: null };
}

export async function dbConnect() {
  const cached = globalWithMongoose.__mongooseConnection;

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

export default dbConnect;
