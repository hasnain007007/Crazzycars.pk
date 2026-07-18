/** Server-side customer session from JWT cookie. */
import jwt from "jsonwebtoken";
import Customer from "@/lib/models/Customer.model";
import { dbConnect } from "@/lib/db";

export async function getAuthedCustomer(req) {
  const token =
    req.cookies.get("customer_token")?.value || req.cookies.get("store_token")?.value;
  if (!token) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  const customerId = decoded.customerId || decoded.sub;
  if (!customerId || decoded.type !== "store_customer") return null;

  await dbConnect();
  const customer = await Customer.findById(customerId).select("-password -passwordHash");
  if (!customer || customer.isActive === false) return null;
  return customer;
}
