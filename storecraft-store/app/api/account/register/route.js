/**
 * @deprecated Use /api/customer/register. Thin adapter kept for orphan AccountRegisterView.
 */
import { NextResponse } from "next/server";
import { POST as customerRegister } from "../../customer/register/route";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  let firstName = String(body.firstName || "").trim();
  let lastName = String(body.lastName || "").trim();
  if ((!firstName || !lastName) && body.name) {
    const parts = String(body.name).trim().split(/\s+/);
    firstName = firstName || parts[0] || "";
    lastName = lastName || parts.slice(1).join(" ") || firstName;
  }
  const adapted = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      firstName,
      lastName,
      email: body.email,
      password: body.password,
      phone: body.phone,
    }),
  });
  const res = await customerRegister(adapted);
  res.headers.set("Deprecation", "true");
  res.headers.set("Link", '</api/customer/register>; rel="successor-version"');
  return res;
}
