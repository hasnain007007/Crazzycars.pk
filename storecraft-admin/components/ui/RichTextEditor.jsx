/**
 * TipTap rich text — toolbar expands inline for extra formatting (More).
 * Supports `content` or `value`, `variant`: "full" | "lite".
 */
"use client";

import { CharacterCount } from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Youtube } from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

/** Persist inline width in HTML for storefront `.article-content img`. */
const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
}).configure({ inline: true, allowBase64: true });

function imageDisplayStyle(widthValue) {
  const base = "display: block; margin: 8px auto; height: auto;";
  if (widthValue === "auto") return `${base} width: auto; max-width: 100%;`;
  return `${base} width: ${widthValue}; max-width: 100%;`;
}

function getSelectedImageAttrs(editor) {
  if (!editor || !editor.isActive("image")) return null;
  return editor.getAttributes("image");
}

function parseWidthFromStyle(style) {
  if (!style || typeof style !== "string") return "100%";
  if (/width:\s*auto/i.test(style)) return "auto";
  const m = style.match(/width:\s*([\d.]+%)/i);
  if (m) return m[1];
  return "100%";
}

export function RichTextEditor({
  content,
  value,
  onChange,
  placeholder = "",
  minHeight = 300,
  label,
  variant = "full",
}) {
  const html = content ?? value ?? "";
  const isLite = variant === "lite";

  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const imageInputRef = useRef(null);
  const imageToInsertRef = useRef(null);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [imageToInsert, setImageToInsert] = useState(null);
  const [selectedSize, setSelectedSize] = useState("100%");
  const [selectedImageAttrs, setSelectedImageAttrs] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [vidOpen, setVidOpen] = useState(false);
  const [vidUrl, setVidUrl] = useState("");
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const tablePickerRef = useRef(null);
  /** Skip one props→editor sync after local edits (prevents wiping insertTable etc.). */
  const skipNextPropSyncRef = useRef(false);

  const extensions = useMemo(() => {
    const placeholderExt = Placeholder.configure({
      placeholder: placeholder || "Start writing…",
    });

    const sharedLite = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ["paragraph", "listItem", "heading"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-teal-600 underline" },
      }),
      EditorImage,
      placeholderExt,
    ];

    const sharedFull = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph", "listItem"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-teal-600 underline" },
      }),
      EditorImage,
      Table.configure({ resizable: true, HTMLAttributes: { class: "tiptap-table" } }),
      TableRow,
      TableHeader,
      TableCell,
      Gapcursor,
      TextStyle,
      Color,
      FontFamily.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      Youtube.configure({ width: 640, height: 360, HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      placeholderExt,
      CharacterCount.configure({ limit: null }),
    ];

    return isLite ? sharedLite : sharedFull;
  }, [isLite, placeholder]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: html || "",
      editorProps: {
        attributes: {
          class: "tiptap-editor-content prose prose-sm max-w-none outline-none focus:outline-none",
        },
      },
      onUpdate: ({ editor: ed }) => {
        skipNextPropSyncRef.current = true;
        onChange?.(ed.getHTML());
      },
    },
    [extensions, isLite]
  );

  const showTableControls =
    !isLite &&
    editor &&
    (editor.isActive("table") ||
      editor.isActive("tableRow") ||
      editor.isActive("tableHeader") ||
      editor.isActive("tableCell"));

  useEffect(() => {
    if (!editor || sourceMode) return;
    if (skipNextPropSyncRef.current) {
      skipNextPropSyncRef.current = false;
      return;
    }
    const cur = editor.getHTML();
    const next = html || "";
    if (next !== cur) {
      editor.commands.setContent(next, false);
    }
  }, [editor, html, sourceMode]);

  useEffect(() => {
    imageToInsertRef.current = imageToInsert;
  }, [imageToInsert]);

  useEffect(() => {
    if (!editor) return;
    const syncImageSelection = () => {
      if (imageToInsertRef.current) {
        setSelectedImageAttrs(null);
        return;
      }
      if (editor.isActive("image")) {
        const attrs = editor.getAttributes("image");
        setSelectedImageAttrs(attrs || {});
        setSelectedSize(parseWidthFromStyle(attrs?.style));
      } else {
        setSelectedImageAttrs(null);
      }
    };
    editor.on("selectionUpdate", syncImageSelection);
    editor.on("transaction", syncImageSelection);
    syncImageSelection();
    return () => {
      editor.off("selectionUpdate", syncImageSelection);
      editor.off("transaction", syncImageSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    if (!showTablePicker) return;
    const handleClickOutside = (e) => {
      if (tablePickerRef.current && !tablePickerRef.current.contains(e.target)) {
        setShowTablePicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showTablePicker]);

  const insertTableFromPicker = useCallback(() => {
    if (!editor) {
      console.error("Editor not ready");
      toast.error("Editor not ready — try again in a moment");
      return;
    }
    const rows = Math.min(20, Math.max(1, Number(tableRows) || 3));
    const cols = Math.min(10, Math.max(1, Number(tableCols) || 3));
    try {
      const ok = editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      if (!ok) {
        console.error("insertTable command returned false", { rows, cols });
        toast.error("Could not insert table — click in the editor and try again");
        return;
      }
      setShowTablePicker(false);
      setTableRows(3);
      setTableCols(3);
    } catch (e) {
      console.error("Table insert error:", e);
      toast.error(e?.message || "Failed to insert table");
    }
  }, [editor, tableRows, tableCols]);

  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be under 10MB");
        return;
      }

      const toastId = toast.loading("Uploading image...");

      try {
        const sigRes = await fetch("/api/upload-signature", {
          credentials: "include",
        });
        const sigData = await sigRes.json();

        if (!sigData.success) {
          throw new Error(sigData.error || "Failed to get upload signature");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sigData.apiKey);
        formData.append("timestamp", String(sigData.timestamp));
        formData.append("signature", sigData.signature);
        formData.append("folder", sigData.folder);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (uploadData.secure_url) {
          toast.success("Image uploaded!", { id: toastId });
          setSelectedSize("100%");
          const cleanAlt = file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ")
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .trim();
          setImageToInsert({
            url: uploadData.secure_url,
            alt: cleanAlt || "Product image",
          });
          setShowSizePicker(true);
        } else {
          const msg = uploadData.error?.message || uploadData.error || "Upload failed";
          throw new Error(typeof msg === "string" ? msg : "Upload failed");
        }
      } catch (err) {
        toast.error(`Image upload failed: ${err.message}`, { id: toastId });
      }

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    },
    [editor]
  );

  const applySourceToEditor = useCallback(() => {
    if (!editor) return;
    try {
      editor.commands.setContent(sourceText || "", false);
      onChange?.(editor.getHTML());
      setSourceMode(false);
    } catch {
      /* keep source mode */
    }
  }, [editor, onChange, sourceText]);

  if (!editor) {
    return (
      <div className="space-y-1">
        {label ? <span className="text-sm font-medium text-[#374151]">{label}</span> : null}
        <div className="animate-pulse rounded-lg border border-[#e5e7eb] bg-[#f3f4f6]" style={{ minHeight }} />
      </div>
    );
  }

  const shell = (child) => (
    <div className={fullscreen ? "fixed inset-0 z-[400] flex flex-col bg-white" : "space-y-1"}>
      {fullscreen ? (
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-3 py-2">
          <span className="text-sm font-medium text-[#374151]">Editor (fullscreen)</span>
          <button
            type="button"
            className="rounded border border-[#e5e7eb] px-2 py-1 text-sm hover:bg-[#f9fafb]"
            onClick={() => setFullscreen(false)}
          >
            ✕ Close
          </button>
        </div>
      ) : null}
      {label && !fullscreen ? <label className="block text-sm font-medium text-[#374151]">{label}</label> : null}
      {label && fullscreen ? <span className="sr-only">{label}</span> : null}
      <div className={fullscreen ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}>{child}</div>
    </div>
  );

  const D = () => (
    <span style={{ width: 1, height: 20, background: "#e5e7eb", display: "inline-block", margin: "0 3px", flexShrink: 0 }} />
  );

  const T = (label, active, onClick, title) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: "4px 7px",
        border: "1px solid",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        flexShrink: 0,
        borderColor: active ? "#009688" : "#e5e7eb",
        background: active ? "#e6f7f5" : "#fff",
        color: active ? "#009688" : "#374151",
        lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  );

  const editorToolbar = (
    <div
      style={{
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        padding: "6px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "nowrap",
          overflowX: "auto",
        }}
      >
        {T(<b>B</b>, editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
        {T(<i>I</i>, editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic")}
        {T(<u>U</u>, editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline")}
        {T(<s>S</s>, editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Strikethrough")}
        <D />
        {T("H1", editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Heading 1")}
        {T("H2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Heading 2")}
        {T("H3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Heading 3")}
        <D />
        {T("•≡", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet List")}
        {T("1≡", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered List")}
        <D />
        {T("⬅", editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "Align Left")}
        {T("↔", editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Align Center")}
        {T("➡", editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "Align Right")}
        {T("☰", editor.isActive({ textAlign: "justify" }), () => editor.chain().focus().setTextAlign("justify").run(), "Justify")}
        <D />
        {!isLite ? (
          <>
            {/* Table button with picker */}
            <div ref={tablePickerRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowTablePicker((p) => !p)}
                title="Insert Table"
                style={{
                  padding: "5px 8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 4,
                  background: showTablePicker ? "#e6f7f5" : "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: showTablePicker ? "#009688" : "#374151",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                ⊞ Table
                <span style={{ fontSize: 10 }}>▼</span>
              </button>

              {showTablePicker ? (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    zIndex: 1000,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    minWidth: 220,
                    marginTop: 4,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111827",
                      margin: "0 0 12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Insert Table
                  </p>

                  <div style={{ marginBottom: 10 }}>
                    <label
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Rows
                      <span
                        style={{
                          background: "#009688",
                          color: "#fff",
                          borderRadius: 4,
                          padding: "1px 8px",
                          fontSize: 11,
                        }}
                      >
                        {tableRows}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={tableRows}
                      onChange={(e) => setTableRows(Number(e.target.value))}
                      style={{
                        width: "100%",
                        accentColor: "#009688",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: "#9ca3af",
                        marginTop: 2,
                      }}
                    >
                      <span>1</span>
                      <span>20</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Columns
                      <span
                        style={{
                          background: "#009688",
                          color: "#fff",
                          borderRadius: 4,
                          padding: "1px 8px",
                          fontSize: 11,
                        }}
                      >
                        {tableCols}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={tableCols}
                      onChange={(e) => setTableCols(Number(e.target.value))}
                      style={{
                        width: "100%",
                        accentColor: "#009688",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: "#9ca3af",
                        marginTop: 2,
                      }}
                    >
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      padding: 8,
                      marginBottom: 12,
                      textAlign: "center",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px" }}>
                      Preview: {tableRows} × {tableCols} table
                    </p>
                    {(() => {
                      const pr = Math.min(tableRows, 5);
                      const pc = Math.min(tableCols, 6);
                      return (
                        <div
                          style={{
                            display: "inline-grid",
                            gridTemplateColumns: `repeat(${pc}, 16px)`,
                            gridTemplateRows: `repeat(${pr}, 12px)`,
                            gap: 2,
                          }}
                        >
                          {Array.from({ length: pr * pc }).map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: 16,
                                height: 12,
                                background: "#009688",
                                borderRadius: 2,
                              }}
                            />
                          ))}
                        </div>
                      );
                    })()}
                    {tableRows > 5 || tableCols > 6 ? (
                      <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0" }}>(preview shows first 5×6)</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      insertTableFromPicker();
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#009688",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Insert {tableRows} × {tableCols} Table
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTablePicker(false)}
                    style={{
                      width: "100%",
                      padding: "6px",
                      background: "transparent",
                      color: "#6b7280",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      marginTop: 6,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
            <D />
          </>
        ) : null}

        {showTableControls ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#1D4ED8",
                marginRight: 4,
                letterSpacing: "0.04em",
              }}
            >
              TABLE:
            </span>

            <button
              type="button"
              title="Add Row Below"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              style={{
                padding: "3px 8px",
                background: "#DBEAFE",
                border: "1px solid #93C5FD",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#1E40AF",
              }}
            >
              + Row ↓
            </button>

            <button
              type="button"
              title="Add Row Above"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              style={{
                padding: "3px 8px",
                background: "#DBEAFE",
                border: "1px solid #93C5FD",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#1E40AF",
              }}
            >
              + Row ↑
            </button>

            <button
              type="button"
              title="Delete Row"
              onClick={() => editor.chain().focus().deleteRow().run()}
              style={{
                padding: "3px 8px",
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#991B1B",
              }}
            >
              - Row
            </button>

            <span style={{ width: 1, height: 16, background: "#BFDBFE", margin: "0 2px" }} />

            <button
              type="button"
              title="Add Column Right"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              style={{
                padding: "3px 8px",
                background: "#DBEAFE",
                border: "1px solid #93C5FD",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#1E40AF",
              }}
            >
              + Col →
            </button>

            <button
              type="button"
              title="Add Column Left"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              style={{
                padding: "3px 8px",
                background: "#DBEAFE",
                border: "1px solid #93C5FD",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#1E40AF",
              }}
            >
              + Col ←
            </button>

            <button
              type="button"
              title="Delete Column"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              style={{
                padding: "3px 8px",
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#991B1B",
              }}
            >
              - Col
            </button>

            <span style={{ width: 1, height: 16, background: "#BFDBFE", margin: "0 2px" }} />

            <button
              type="button"
              title="Delete Table"
              onClick={() => editor.chain().focus().deleteTable().run()}
              style={{
                padding: "3px 8px",
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: "#991B1B",
              }}
            >
              🗑 Delete Table
            </button>

            <p style={{ width: "100%", margin: "6px 0 0", fontSize: 10, color: "#1D4ED8" }}>
              Click in any cell and use Tab to move between cells
            </p>
          </div>
        ) : null}

        {T(
          "🔗",
          editor.isActive("link"),
          () => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              setShowLinkInput((p) => !p);
              setShowMore(false);
            }
          },
          "Link"
        )}
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          title="Upload Image from Gallery"
          style={{
            padding: "4px 7px",
            border: "1px solid",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 400,
            flexShrink: 0,
            borderColor: "#e5e7eb",
            background: "#fff",
            color: "#374151",
            lineHeight: 1.4,
          }}
        >
          🖼
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Enter image URL:");
            if (url?.trim()) {
              setSelectedSize("100%");
              setImageToInsert({ url: url.trim(), alt: "" });
              setShowSizePicker(true);
            }
          }}
          title="Insert Image from URL"
          style={{
            padding: "4px 7px",
            border: "1px solid",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 400,
            flexShrink: 0,
            borderColor: "#e5e7eb",
            background: "#fff",
            color: "#374151",
            lineHeight: 1.4,
          }}
        >
          URL
        </button>
        <D />
        {T("↩", false, () => editor.chain().focus().undo().run(), "Undo")}
        {T("↪", false, () => editor.chain().focus().redo().run(), "Redo")}
        <D />
        <button
          type="button"
          onClick={() => setShowMore((p) => !p)}
          style={{
            padding: "4px 10px",
            border: "1px solid",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            flexShrink: 0,
            borderColor: showMore ? "#009688" : "#e5e7eb",
            background: showMore ? "#e6f7f5" : "#fff",
            color: showMore ? "#009688" : "#374151",
          }}
        >
          {showMore ? "▲ Less" : "▾ More"}
        </button>
      </div>

      {showMore ? (
        <>
          <div style={{ height: 1, background: "#e5e7eb" }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            {T("H4", editor.isActive("heading", { level: 4 }), () => editor.chain().focus().toggleHeading({ level: 4 }).run(), "Heading 4")}
            {T("H5", editor.isActive("heading", { level: 5 }), () => editor.chain().focus().toggleHeading({ level: 5 }).run(), "Heading 5")}
            {T("H6", editor.isActive("heading", { level: 6 }), () => editor.chain().focus().toggleHeading({ level: 6 }).run(), "Heading 6")}
            <D />
            {T("¶ Normal", editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), "Normal Text")}
            {T("❝ Quote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Blockquote")}
            {T("</> Code", editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "Code Block")}
            {T("— Line", false, () => editor.chain().focus().setHorizontalRule().run(), "Horizontal Rule")}
            <D />
            {T("✕ Clear", false, () => editor.chain().focus().clearNodes().unsetAllMarks().run(), "Clear Formatting")}
            {T("🔗✕ Unlink", false, () => editor.chain().focus().unsetLink().run(), "Remove Link")}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              paddingTop: 2,
            }}
          >
            {[
              ["Ctrl+B", "Bold"],
              ["Ctrl+I", "Italic"],
              ["Ctrl+U", "Underline"],
              ["Ctrl+Z", "Undo"],
              ["Ctrl+Y", "Redo"],
              ["Ctrl+K", "Link"],
            ].map(([k, l]) => (
              <span key={k} style={{ fontSize: 10, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}>
                <kbd
                  style={{
                    background: "#f3f4f6",
                    border: "1px solid #e5e7eb",
                    borderRadius: 3,
                    padding: "1px 4px",
                    fontSize: 9,
                    fontFamily: "monospace",
                  }}
                >
                  {k}
                </kbd>
                {l}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  const youtubePanel =
    !isLite && vidOpen ? (
      <div
        style={{
          background: "#f0fdf4",
          padding: "8px 12px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="url"
          placeholder="YouTube URL"
          value={vidUrl}
          onChange={(e) => setVidUrl(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
        />
        <button
          type="button"
          onClick={() => {
            const u = vidUrl.trim();
            if (u) editor.chain().focus().setYoutubeVideo({ src: u }).run();
            setVidUrl("");
            setVidOpen(false);
          }}
          style={{
            padding: "6px 12px",
            background: "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Embed
        </button>
        <button
          type="button"
          onClick={() => setVidOpen(false)}
          style={{
            padding: "6px 10px",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    ) : null;

  const linkImagePanels = (
    <>
      {showLinkInput ? (
        <div
          style={{
            background: "#f0fdf4",
            padding: "8px 12px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="url"
            placeholder="https://crazzycars.pk"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!linkUrl.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
                else editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
                setLinkUrl("");
                setShowLinkInput(false);
              }
            }}
            style={{ flex: 1, minWidth: 200, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
          />
          <button
            type="button"
            onClick={() => {
              if (!linkUrl.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
              else editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
              setLinkUrl("");
              setShowLinkInput(false);
            }}
            style={{
              padding: "6px 12px",
              background: "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            style={{
              padding: "6px 10px",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </>
  );

  const showImageSizePanel =
    (showSizePicker && imageToInsert) || (!showSizePicker && selectedImageAttrs !== null && editor.isActive("image"));

  const presetSizes = [
    { label: "Small", value: "25%" },
    { label: "Medium", value: "50%" },
    { label: "Large", value: "75%" },
    { label: "Full Width", value: "100%" },
    { label: "Auto", value: "auto" },
  ];

  const customPercentValue =
    selectedSize === "auto" ? 100 : Math.min(100, Math.max(10, Number.parseInt(String(selectedSize).replace(/%/g, ""), 10) || 100));

  const imageSizePanel =
    showImageSizePanel && editor ? (
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          {showSizePicker && imageToInsert ? "Insert image — size:" : "Selected image — size:"}
        </span>
        {presetSizes.map((size) => (
          <button
            key={size.value}
            type="button"
            onClick={() => setSelectedSize(size.value)}
            style={{
              padding: "5px 12px",
              border: "1px solid",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              borderColor: selectedSize === size.value ? "#009688" : "#e5e7eb",
              background: selectedSize === size.value ? "#e6f7f5" : "#fff",
              color: selectedSize === size.value ? "#009688" : "#374151",
            }}
          >
            {size.label}
          </button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number"
            min={10}
            max={100}
            value={customPercentValue}
            disabled={selectedSize === "auto"}
            onChange={(e) => {
              const n = Math.min(100, Math.max(10, Number(e.target.value) || 100));
              setSelectedSize(`${n}%`);
            }}
            style={{
              width: 60,
              padding: "4px 8px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 12,
              color: "#374151",
              outline: "none",
            }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>%</span>
        </div>
        {showSizePicker && imageToInsert ? (
          <>
            <button
              type="button"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .setImage({
                    src: imageToInsert.url,
                    alt: imageToInsert.alt || "",
                    style: imageDisplayStyle(selectedSize),
                  })
                  .run();
                setShowSizePicker(false);
                setImageToInsert(null);
                setSelectedSize("100%");
              }}
              style={{
                padding: "6px 16px",
                background: "#009688",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Insert Image
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSizePicker(false);
                setImageToInsert(null);
                setSelectedSize("100%");
              }}
              style={{
                padding: "6px 12px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().updateAttributes("image", { style: imageDisplayStyle(selectedSize) }).run();
            }}
            style={{
              padding: "6px 16px",
              background: "#009688",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Apply size
          </button>
        )}
      </div>
    ) : null;

  const cc = editor.storage?.characterCount;
  const wordStats =
    !isLite && cc ? (
      <div
        style={{
          background: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          padding: "6px 12px",
          fontSize: 11,
          color: "#9ca3af",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{typeof cc.words === "function" ? cc.words() : 0} words</span>
        <span>{typeof cc.characters === "function" ? cc.characters() : 0} characters</span>
      </div>
    ) : null;

  const editorSurface = (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        ...(fullscreen ? { flex: 1, display: "flex", flexDirection: "column", minHeight: "60vh" } : {}),
      }}
    >
      {!sourceMode ? (
        <>
          {editorToolbar}
          {imageSizePanel}
          {linkImagePanels}
          {youtubePanel}
        </>
      ) : null}
      {!sourceMode ? (
        <div style={{ minHeight, background: "#fff", flex: fullscreen ? 1 : undefined, overflow: "auto" }}>
          <EditorContent editor={editor} onFocus={() => setShowMore(false)} />
        </div>
      ) : (
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          style={{
            width: "100%",
            minHeight,
            padding: 16,
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.6,
            border: "none",
            outline: "none",
            resize: "vertical",
          }}
          spellCheck={false}
        />
      )}
      {sourceMode ? (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 12px", borderTop: "1px solid #e5e7eb" }}>
          <button type="button" style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }} onClick={() => setSourceMode(false)}>
            Cancel
          </button>
          <button
            type="button"
            style={{ padding: "6px 12px", border: "none", borderRadius: 6, background: "#009688", color: "#fff", cursor: "pointer" }}
            onClick={applySourceToEditor}
          >
            Apply HTML
          </button>
        </div>
      ) : null}
      {!sourceMode && wordStats}
    </div>
  );

  return shell(
    <>
      {helpOpen ? (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Editor help</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#374151]">
              <li>Use the toolbar for formatting; links do not open on click while editing.</li>
              <li>Tables: use ⊞ Table to choose rows/columns, or paste markup / HTML source.</li>
              <li>Fullscreen: press Escape or Close to exit.</li>
              <li>Source: edit raw HTML, then Apply HTML.</li>
            </ul>
            <button type="button" className="mt-4 rounded-lg bg-[#009688] px-4 py-2 text-sm text-white" onClick={() => setHelpOpen(false)}>
              OK
            </button>
          </div>
        </div>
      ) : null}
      {editorSurface}
    </>
  );
}

export default RichTextEditor;
