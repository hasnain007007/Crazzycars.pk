"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ZoomIn, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { aspectWarning, COLORS } from "./socialTheme";

const MAX_FILES = 10;
const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic", ".HEIC"],
};

function uploadOne(postId, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("files", file);
    xhr.open("POST", `/api/social/posts/${postId}/images`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve(json);
        } else {
          reject(new Error(json.error || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

function SortableTile({
  id,
  img,
  previewUrl,
  progress,
  disabled,
  onRemove,
  onZoom,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  const src = previewUrl || img.url;
  const warn = aspectWarning(img.width, img.height);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square overflow-hidden rounded-xl border border-[#E8E8ED] bg-[#F6F6F8]"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF]">…</div>
      )}
      {progress != null && progress < 1 ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
          <div
            className="h-full transition-all"
            style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: COLORS.brand }}
          />
        </div>
      ) : null}
      {warn ? (
        <span
          className="absolute left-1 top-1 rounded bg-amber-500/90 p-0.5 text-white"
          title="Aspect ratio — IG/FB auto-fit se crop ho sakta hai"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <div className="absolute right-1 top-1 flex gap-0.5">
        <button
          type="button"
          onClick={() => onZoom(src)}
          className="rounded bg-black/50 p-1 text-white"
          aria-label="View"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        {!disabled ? (
          <button
            type="button"
            onClick={() => onRemove(img)}
            className="rounded bg-black/50 p-1 text-white"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {!disabled ? (
        <button
          type="button"
          className="absolute bottom-1 left-1 rounded bg-black/40 p-1 text-white"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function PhotoDropzone({ postId, images = [], onChange, disabled, onReorder }) {
  const [uploadProgress, setUploadProgress] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const blobUrls = useRef(new Map());

  const sorted = useMemo(
    () => [...images].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [images]
  );

  const ids = useMemo(() => sorted.map((img, i) => String(img.order ?? i)), [sorted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const persistOrder = useCallback(
    async (nextImages) => {
      onChange?.(nextImages);
      if (!postId) return;
      try {
        const res = await fetch(`/api/social/posts/${postId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: nextImages }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          onReorder?.(nextImages);
          return;
        }
        onChange?.(json.images || nextImages);
      } catch {
        onReorder?.(nextImages);
      }
    },
    [postId, onChange, onReorder]
  );

  const handleFiles = useCallback(
    async (fileList) => {
      if (disabled) return;
      const files = Array.from(fileList || []).filter(Boolean);
      if (!files.length) return;
      if (!postId) {
        toast.error("Pehle post save karein — phir photos upload ho sakti hain");
        return;
      }
      const room = MAX_FILES - sorted.length;
      if (room <= 0) {
        toast.error(`Max ${MAX_FILES} images`);
        return;
      }
      const batch = files.slice(0, room);
      for (const f of batch) {
        if (f.size > MAX_BYTES) {
          toast.error(`${f.name}: 15MB se zyada hai`);
          continue;
        }
        const key = `${f.name}-${f.size}-${Date.now()}`;
        setUploadProgress((p) => ({ ...p, [key]: 0 }));
        try {
          const json = await uploadOne(postId, f, (pct) =>
            setUploadProgress((p) => ({ ...p, [key]: pct }))
          );
          onChange?.(json.images || []);
          toast.success("Photo upload ho gayi");
        } catch (e) {
          toast.error(e.message || "Upload fail");
        } finally {
          setUploadProgress((p) => {
            const n = { ...p };
            delete n[key];
            return n;
          });
        }
      }
    },
    [disabled, postId, sorted.length, onChange]
  );

  const onDrop = useCallback(
    (accepted) => {
      handleFiles(accepted);
    },
    [handleFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_BYTES,
    disabled: disabled || !postId || sorted.length >= MAX_FILES,
    multiple: true,
  });

  useEffect(() => {
    function onPaste(e) {
      if (disabled || !postId) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imgs = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) imgs.push(f);
        }
      }
      if (imgs.length) {
        e.preventDefault();
        handleFiles(imgs);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, postId, handleFiles]);

  async function removeImage(img) {
    if (disabled || !postId) return;
    const order = Number(img.order);
    try {
      const res = await fetch(`/api/social/posts/${postId}/images`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Remove failed");
        return;
      }
      onChange?.(json.images || []);
    } catch {
      toast.error("Network error");
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sorted, oldIndex, newIndex).map((img, idx) => ({
      ...img,
      order: idx + 1,
    }));
    persistOrder(reordered);
  }

  const uploading = Object.keys(uploadProgress).length > 0;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          isDragActive ? "border-[#ED1C24] bg-red-50/40" : "border-[#D1D1DA] bg-[#F6F6F8]"
        } ${disabled || sorted.length >= MAX_FILES ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-[#111114]">
          Photos yahan drag karein ya click karein
        </p>
        <p className="mt-1 text-xs text-[#6B6B76]">
          Ctrl+V paste · JPG PNG WEBP · max {MAX_FILES} · 15MB each
        </p>
        {!postId ? (
          <p className="mt-2 text-xs font-medium text-amber-700">Save draft pehle — phir upload</p>
        ) : null}
      </div>

      {sorted.length || uploading ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {sorted.map((img, i) => (
                <SortableTile
                  key={String(img.order ?? i)}
                  id={String(img.order ?? i)}
                  img={img}
                  disabled={disabled}
                  onRemove={removeImage}
                  onZoom={setLightbox}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
