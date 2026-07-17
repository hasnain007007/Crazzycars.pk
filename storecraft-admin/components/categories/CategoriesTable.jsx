/**
 * Responsive categories data table with actions column.
 */
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-500/10",
      ].join(" ")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function CategoriesTable({ rows, loading, onDelete }) {
  const [expanded, setExpanded] = useState({});
  const hasNested = useMemo(() => rows.some((row) => Array.isArray(row.children) && row.children.length), [rows]);
  const flattened = useMemo(() => {
    if (!hasNested) return rows || [];
    const out = [];
    const walk = (nodes, depth = 0, parentVisible = true) => {
      nodes.forEach((node) => {
        if (!parentVisible) return;
        out.push({ ...node, _depth: depth });
        const id = String(node._id);
        const open = expanded[id] ?? true;
        if (node.children?.length) walk(node.children, depth + 1, open);
      });
    };
    walk(rows || [], 0, true);
    return out;
  }, [rows, expanded, hasNested]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        <div className="animate-pulse space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-[#f3f4f6]" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-center text-sm text-[#6b7280] shadow-sm">
        No categories yet. Create categories like Seat Covers, Floor Mats, Steering Covers, etc.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-[#111827]">
          <thead className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-[#f9fafb] text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">ID</th>
              <th className="whitespace-nowrap px-4 py-3">Name</th>
              <th className="whitespace-nowrap px-4 py-3">Slug</th>
              <th className="whitespace-nowrap px-4 py-3">Parent</th>
              <th className="whitespace-nowrap px-4 py-3">Image</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3">Top</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {flattened.map((row) => (
              <tr key={row._id} className="hover:bg-[#f9fafb]">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#6b7280]">{row._id}</td>
                <td className="max-w-[280px] px-4 py-3 font-medium text-[#111827]">
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${(row.level ?? row._depth ?? 0) * 16}px` }}>
                    {row.children?.length ? (
                      <button
                        type="button"
                        onClick={() => setExpanded((s) => ({ ...s, [String(row._id)]: !(s[String(row._id)] ?? true) }))}
                        className="text-xs text-[#6b7280]"
                        aria-label="Toggle subcategories"
                      >
                        {(expanded[String(row._id)] ?? true) ? "▼" : "▶"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#9ca3af]">●</span>
                    )}
                    <span>
                      {row.name}
                      {row.children?.length ? (
                        <span className="ml-1 text-xs font-normal text-[#6b7280]">({row.children.length} subcategories)</span>
                      ) : null}
                    </span>
                  </div>
                  {row.parentName || row.parentCategory?.name ? (
                    <p className="mt-0.5 text-xs text-[#9ca3af]" style={{ paddingLeft: `${(row.level ?? row._depth ?? 0) * 16 + 20}px` }}>
                      Parent: {row.parentName || row.parentCategory?.name}
                    </p>
                  ) : null}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-[#6b7280]">{row.slug}</td>
                <td className="max-w-[120px] truncate px-4 py-3 text-[#6b7280]">
                  {row.parentCategory?.name || "—"}
                </td>
                <td className="px-4 py-2">
                  {row.image?.url ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-[#e5e7eb] bg-[#f9fafb]">
                      <Image src={row.image.url} alt="" width={40} height={40} className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <span className="text-xs text-[#9ca3af]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-[#374151]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {Number(row.level || 0) === 0 ? "Top" : Number(row.level || 0) === 1 ? "Sub" : "Sub-Sub"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    href={`/catalog/categories/${row._id}`}
                    className="mr-3 text-sm font-medium text-[#1d6fb8] hover:underline"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/catalog/categories/new?parent=${row._id}`}
                    className="mr-3 text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Add Subcategory
                  </Link>
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600 hover:underline"
                    onClick={() => onDelete(row)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
