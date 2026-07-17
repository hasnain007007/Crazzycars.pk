import { redirect } from "next/navigation";

/**
 * Admin app home: always send users to the dashboard (auth enforced by proxy).
 */
export default function HomePage() {
  redirect("/dashboard");
}
