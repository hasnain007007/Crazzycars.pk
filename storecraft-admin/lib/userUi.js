import { normalizeRole } from "@/lib/permissions";

/** Badge colour per canonical role (old superadmin/admin/editor ids map via normalizeRole). */
export function roleBadgeClass(role) {
  const map = {
    owner: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
    manager: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    staff: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    superadmin: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
    admin: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    editor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    viewer: "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
  };
  return map[normalizeRole(role)] || map.viewer;
}
