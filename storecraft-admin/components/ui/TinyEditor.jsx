/**
 * Rich text field used across categories, products, and blog.
 * TipTap-based (no TinyMCE cloud API key / premium plugins).
 */
"use client";

import { RichTextEditor } from "@/components/ui/RichTextEditor";

export default function TinyEditor({
  value,
  onChange,
  height = 500,
  placeholder = "Start writing...",
  variant = "full",
}) {
  const minHeight = typeof height === "number" && height > 0 ? height : 300;

  return (
    <RichTextEditor
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
      variant={variant}
    />
  );
}
