/**
 * Admin route group layout: fixed sidebar, top bar, and main content area.
 */
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
