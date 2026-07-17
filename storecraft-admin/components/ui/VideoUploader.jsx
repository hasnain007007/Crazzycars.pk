"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";

const MAX_SIZE = 500 * 1024 * 1024;

export default function VideoUploader({ videos = [], onChange, maxVideos = 3 }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;

    const allowedExtensions = [
      "mp4",
      "mov",
      "webm",
      "avi",
      "mkv",
      "3gp",
      "wmv",
      "heic",
      "heif",
      "m4v",
      "mpg",
      "mpeg",
      "ogv",
      "qt",
    ];

    const getExt = (name) => name.split(".").pop().toLowerCase();

    const ext = getExt(file.name);

    const allowedMimes = [
      "video/mp4",
      "video/quicktime",
      "video/mov",
      "video/webm",
      "video/avi",
      "video/x-msvideo",
      "video/x-matroska",
      "video/3gpp",
      "video/wmv",
      "video/x-ms-wmv",
      "image/heic",
      "image/heif",
      "",
    ];

    const isAllowedType = allowedMimes.includes(file.type);
    const isAllowedExt = allowedExtensions.includes(ext);

    if (!isAllowedType && !isAllowedExt) {
      toast.error("Please upload MP4, MOV, HEIC, WebM or AVI");
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error("File must be under 500MB");
      return;
    }

    if (videos.length >= maxVideos) {
      toast.error(`Maximum ${maxVideos} videos allowed`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading("⏳ Uploading...");

    try {
      const isHeic =
        ["heic", "heif"].includes(ext) || file.type.includes("heic") || file.type.includes("heif");
      const resourceType = isHeic ? "image" : "video";

      const sigRes = await fetch(`/api/upload-video?type=${resourceType}`, { credentials: "include" });
      const sigData = await sigRes.json();

      if (!sigData.success) {
        throw new Error(sigData.error || "Signature failed");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", String(sigData.timestamp));
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
            if (pct === 100) {
              toast.loading("⚙️ Processing file...", { id: toastId });
            }
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
              resolve(data);
            } else {
              reject(new Error(data.error?.message || `Upload failed (${xhr.status})`));
            }
          } catch {
            reject(new Error("Bad response from Cloudinary"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });

        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });

      let thumbnailUrl = result.secure_url;
      if (resourceType === "video") {
        try {
          const thumbRes = await fetch("/api/upload-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ publicId: result.public_id }),
          });
          const thumbData = await thumbRes.json();
          if (thumbData.success && thumbData.thumbnail) {
            thumbnailUrl = thumbData.thumbnail;
          }
        } catch (e) {
          console.error("Thumbnail error:", e);
        }
      }

      const newVideo = {
        url: result.secure_url,
        originalUrl: result.secure_url,
        publicId: result.public_id,
        thumbnail: thumbnailUrl,
        format: result.format || ext,
        duration: result.duration || 0,
        size: result.bytes || file.size,
        width: result.width || 0,
        height: result.height || 0,
        title: file.name.replace(/\.[^/.]+$/, ""),
        isPrimary: videos.length === 0,
        resourceType,
      };

      onChange([...videos, newVideo]);
      toast.success("✅ File uploaded!", { id: toastId });
    } catch (e) {
      console.error("Upload error:", e);
      toast.error(e.message || "Upload failed", { id: toastId });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = async (index, publicId, resourceType) => {
    if (!window.confirm("Remove this video?")) return;
    try {
      if (publicId) {
        await fetch("/api/upload-video", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ publicId, resourceType: resourceType || "video" }),
        });
      }
    } catch (error) {
      console.error("Delete video error:", error);
    }
    const updated = videos.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((v) => v.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
    toast.success("Video removed");
  };

  const handleSetPrimary = (index) => {
    onChange(videos.map((v, i) => ({ ...v, isPrimary: i === index })));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div>
      {videos.length < maxVideos ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#009688" : "#e5e7eb"}`,
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            background: dragOver ? "#f0fdf9" : "#f9fafb",
            transition: "all 0.2s",
            marginBottom: 16,
          }}
        >
          {uploading ? (
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#009688", margin: "0 0 12px" }}>
                Uploading to Cloudinary…
              </p>
              <div
                style={{
                  background: "#e5e7eb",
                  borderRadius: 99,
                  height: 8,
                  overflow: "hidden",
                  maxWidth: 300,
                  margin: "0 auto 8px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background: "linear-gradient(90deg, #009688, #00bcd4)",
                    borderRadius: 99,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{uploadProgress}% complete</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>
                Upload Product Video
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 4px" }}>
                Drag and drop or click to browse
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>MP4 · MOV · HEIC · WebM · AVI · Max 500MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,.mov,.mp4,.webm,.avi,.mkv,.heic,.heif,.m4v,.ogv,video/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={uploading}
          />
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {videos.map((video, index) => (
            <div
              key={video.publicId || index}
              style={{
                background: "#fff",
                border: `2px solid ${video.isPrimary ? "#009688" : "#e5e7eb"}`,
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: 160,
                  minHeight: 100,
                  background: "#111111",
                  position: "relative",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt="Video thumbnail"
                    style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                  />
                ) : null}
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: 36,
                    height: 36,
                    background: "rgba(255,255,255,0.9)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  ▶
                </div>
              </div>

              <div style={{ flex: 1, padding: "14px 16px" }}>
                <input
                  type="text"
                  value={video.title || ""}
                  onChange={(e) => {
                    const next = [...videos];
                    next[index] = { ...next[index], title: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Video title..."
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid #f3f4f6",
                    padding: "4px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                    outline: "none",
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  {video.format ? (
                    <span
                      style={{
                        fontSize: 10,
                        background: "#e6f7f5",
                        color: "#009688",
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {video.format}
                    </span>
                  ) : null}
                  {video.duration > 0 ? (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>⏱ {formatDuration(video.duration)}</span>
                  ) : null}
                  {video.size > 0 ? (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>📦 {formatFileSize(video.size)}</span>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => window.open(video.url, "_blank", "noopener,noreferrer")}
                    style={{
                      padding: "5px 12px",
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#374151",
                    }}
                  >
                    Preview
                  </button>
                  {!video.isPrimary ? (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      style={{
                        padding: "5px 12px",
                        background: "#e6f7f5",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "#009688",
                      }}
                    >
                      Set Primary
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleRemove(index, video.publicId, video.resourceType)}
                    style={{
                      padding: "5px 12px",
                      background: "#fee2e2",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#dc2626",
                      marginLeft: "auto",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: "10px 14px",
          marginTop: 12,
          fontSize: 12,
          color: "#92400e",
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Supports MP4, MOV, HEIC, WebM, and AVI. Files upload directly to Cloudinary (signed upload uses folder and
          timestamp only so the signature always matches). HEIC is stored as an image. Maximum file size: 500MB.
        </p>
      </div>
    </div>
  );
}
