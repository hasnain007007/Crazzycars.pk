export function roleBadgeClass(role) {
  const map = {
    superadmin: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
    admin: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    editor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
    viewer: "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100",
  };
  return map[role] || map.viewer;
}
