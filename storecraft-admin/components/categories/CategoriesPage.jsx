"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function statusBadge(status) {
  const active = status === "active";
  return {
    label: active ? "Active" : "Draft",
    style: {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 999,
      padding: "3px 8px",
      background: active ? "#dcfce7" : "#e5e7eb",
      color: active ? "#166534" : "#374151",
    },
  };
}

function levelBadge(level) {
  if (level === 0) return { label: "Top Level", bg: "#dbeafe", color: "#1d4ed8" };
  if (level === 1) return { label: "Sub", bg: "#ccfbf1", color: "#0f766e" };
  return { label: "Sub-Sub", bg: "#ffedd5", color: "#c2410c" };
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [flatRows, setFlatRows] = useState([]);
  const [treeRows, setTreeRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("tree");
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [flatRes, treeRes] = await Promise.all([
        fetch("/api/categories?flat=true", { credentials: "include" }),
        fetch("/api/categories?tree=true", { credentials: "include" }),
      ]);
      const [flatJson, treeJson] = await Promise.all([flatRes.json(), treeRes.json()]);
      if (!flatRes.ok || !flatJson.success) throw new Error(flatJson.error || "Failed to load categories");
      if (!treeRes.ok || !treeJson.success) throw new Error(treeJson.error || "Failed to load tree");

      setFlatRows(flatJson.categories || []);
      setTreeRows(treeJson.categories || []);

      const nextExpanded = {};
      (treeJson.categories || []).forEach((node) => {
        nextExpanded[String(node._id)] = true;
      });
      setExpanded(nextExpanded);
    } catch (error) {
      toast.error(error.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredFlat = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flatRows.filter((row) => {
      const statusOk = statusFilter === "all" ? true : row.status === statusFilter;
      const nameOk = q ? String(row.name || "").toLowerCase().includes(q) : true;
      return statusOk && nameOk;
    });
  }, [flatRows, search, statusFilter]);

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filterNode = (node) => {
      const children = (node.children || []).map(filterNode).filter(Boolean);
      const nameOk = q ? String(node.name || "").toLowerCase().includes(q) : true;
      const statusOk = statusFilter === "all" ? true : node.status === statusFilter;
      if ((nameOk && statusOk) || children.length) return { ...node, children };
      return null;
    };
    return treeRows.map(filterNode).filter(Boolean);
  }, [treeRows, search, statusFilter]);

  const stats = useMemo(() => {
    const total = flatRows.length;
    const top = flatRows.filter((c) => Number(c.level || 0) === 0).length;
    return { total, top, sub: total - top };
  }, [flatRows]);

  const tryDelete = async (row) => {
    const ok = window.confirm(
      "This will remove the category. Products in this category will be uncategorized."
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${row._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      toast.success("Category deleted");
      load();
    } catch (error) {
      toast.error(error.message || "Delete failed");
    }
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map((node) => {
      const hasChildren = (node.children || []).length > 0;
      const open = expanded[String(node._id)] ?? true;
      const sb = statusBadge(node.status);
      return (
        <div key={node._id} style={{ marginTop: 8 }}>
          <div
            style={{
              ...rowStyle,
              paddingLeft: 12 + level * 20,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [String(node._id)]: !open }))}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#6b7280" }}
                >
                  {open ? "▼" : "▶"}
                </button>
              ) : (
                <span style={{ color: "#9ca3af" }}>•</span>
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {node.name}{" "}
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    ({(node.children || []).length} sub)
                  </span>
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, borderRadius: 999, padding: "2px 8px", background: "#eef2ff", color: "#3730a3" }}>
                    Products: {node.productCount || 0}
                  </span>
                  <span style={sb.style}>{sb.label}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/catalog/categories/new?parent=${node._id}`}>
                <button style={smallBtn}>Add Sub</button>
              </Link>
              <Link href={`/catalog/categories/${node._id}/edit`}>
                <button style={smallBtn}>Edit</button>
              </Link>
              <button onClick={() => tryDelete(node)} style={{ ...smallBtn, color: "#dc2626", borderColor: "#fecaca" }}>
                Delete
              </button>
            </div>
          </div>
          {hasChildren && open ? <div>{renderTree(node.children, level + 1)}</div> : null}
        </div>
      );
    });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Categories</h1>
          <p style={{ margin: "5px 0 0", color: "#6b7280" }}>Manage parent/subcategory hierarchy and storefront visibility.</p>
        </div>
        <Link href="/catalog/categories/new">
          <button style={{ ...smallBtn, background: "#009688", color: "#fff", borderColor: "#009688", padding: "9px 14px" }}>
            + Add Category
          </button>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
        <Card title="Total Categories" value={stats.total} />
        <Card title="Top Level" value={stats.top} />
        <Card title="Sub Categories" value={stats.sub} />
      </div>

      <div style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setView("flat")}
            style={{ ...smallBtn, background: view === "flat" ? "#eff6ff" : "#fff" }}
          >
            Flat View
          </button>
          <button
            type="button"
            onClick={() => setView("tree")}
            style={{ ...smallBtn, background: view === "tree" ? "#eff6ff" : "#fff" }}
          >
            Tree View
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading categories...</div>
        ) : view === "tree" ? (
          filteredTree.length ? (
            renderTree(filteredTree)
          ) : (
            <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>No categories match your filters.</div>
          )
        ) : filteredFlat.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Image", "Name", "Parent", "Products", "Status", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFlat.map((row) => {
                  const lb = levelBadge(Number(row.level || 0));
                  const sb = statusBadge(row.status);
                  return (
                    <tr key={row._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={tdStyle}>
                        {row.image?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.image.url} alt={row.image?.altText || row.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f3f4f6", display: "grid", placeItems: "center" }}>🏷️</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{row.name}</p>
                        <span style={{ marginTop: 4, display: "inline-block", fontSize: 11, borderRadius: 999, padding: "3px 8px", background: lb.bg, color: lb.color }}>{lb.label}</span>
                      </td>
                      <td style={tdStyle}>{row.parentName || "—"}</td>
                      <td style={tdStyle}>{row.productCount || 0}</td>
                      <td style={tdStyle}><span style={sb.style}>{sb.label}</span></td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link href={`/catalog/categories/new?parent=${row._id}`}><button style={smallBtn}>Add Sub</button></Link>
                          <Link href={`/catalog/categories/${row._id}/edit`}><button style={smallBtn}>Edit</button></Link>
                          <button onClick={() => tryDelete(row)} style={{ ...smallBtn, color: "#dc2626", borderColor: "#fecaca" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>No categories match your filters.</div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
};

const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 };
const rowStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 };
const thStyle = { textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#374151", borderBottom: "1px solid #e5e7eb" };
const tdStyle = { padding: "10px 12px", fontSize: 14, color: "#374151" };
const smallBtn = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "6px 10px",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
};

function Card({ title, value }) {
  return (
    <div style={cardStyle}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{title}</p>
      <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 800 }}>{value}</p>
    </div>
  );
}
