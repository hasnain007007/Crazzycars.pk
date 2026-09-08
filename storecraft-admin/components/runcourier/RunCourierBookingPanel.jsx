"use client";

/**
 * Standalone Run Courier booking panel for Order Detail.
 * Does not touch PostEx booking UI or handlers.
 */
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  RUN_COURIER_APIS,
  RUN_COURIER_PRODUCT_TYPES,
  RUN_COURIER_SERVICE_TYPES,
} from "@/lib/runcourier";

function defaultCod(order, orderTotal) {
  const status = String(order?.paymentStatus || "").toLowerCase();
  if (status === "partial") {
    const remaining = Number(order?.payment?.remainingCod);
    if (Number.isFinite(remaining) && remaining >= 0) return Math.round(remaining);
  }
  if (status === "paid") return 0;
  return Math.max(0, Math.round(Number(orderTotal) || 0));
}

export default function RunCourierBookingPanel({
  order,
  orderTotal = 0,
  courierSettings = {},
  rebook = false,
  onBooked,
  onCancelForm,
}) {
  const [carriers, setCarriers] = useState(RUN_COURIER_APIS);
  const [selectedApi, setSelectedApi] = useState(
    courierSettings.runCourierDefaultApi || order?.runCourierApi || "Auto"
  );
  const [productType, setProductType] = useState(
    courierSettings.runCourierProductType || "Overnight"
  );
  const [serviceType, setServiceType] = useState(
    courierSettings.runCourierServiceType || "Overnight"
  );
  const [codAmount, setCodAmount] = useState(0);
  const codManual = useRef(false);
  const [weight, setWeight] = useState(0.5);
  const [pieces, setPieces] = useState(1);
  const [remarks, setRemarks] = useState(
    courierSettings.shipperRemarks ||
      "Call customer before delivery. Do not leave parcel unattended."
  );
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/runcourier/carriers", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.carriers) && json.carriers.length) setCarriers(json.carriers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!order) return;
    if (!codManual.current) {
      setCodAmount(defaultCod(order, orderTotal));
    }
    setPieces(order.items?.length || 1);
    const grams = Number(order.pricing?.totalWeightGrams) || 0;
    const weightKg = grams > 0 ? Math.round((grams / 1000) * 100) / 100 : 0.5;
    setWeight(Math.max(0.5, weightKg));
    if (courierSettings.runCourierDefaultApi) {
      setSelectedApi(courierSettings.runCourierDefaultApi);
    }
  }, [order, orderTotal, courierSettings.runCourierDefaultApi]);

  async function handleBook() {
    if (!order) return;
    setBooking(true);
    setError("");
    setSuccess("");
    try {
      const cod = Math.max(0, Math.round(Number(codAmount) || 0));
      const res = await fetch("/api/runcourier/create-shipment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id || order._id,
          rebook,
          selectedApi,
          productType,
          serviceType,
          codAmount: cod,
          weight,
          pieces,
          remarks,
          paymentMethod: cod > 0 ? "COD" : "Prepaid",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Booking failed");
        toast.error(data.error || "Run Courier booking failed");
        return;
      }
      setSuccess(`Booked! Tracking: ${data.trackingNumber} (${data.selectedApi})`);
      toast.success(`Run Courier booked: ${data.trackingNumber}`);
      // Auto-download airbill PDF on book (same as PostEx).
      const orderId = order.id || order._id;
      const tn = String(data.trackingNumber || "").trim();
      let downloaded = false;
      const rawPdf = String(data.labelPdfBase64 || "").replace(/^data:application\/pdf;base64,/, "");
      if (rawPdf) {
        try {
          const binary = atob(rawPdf);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.rel = "noopener";
          a.download = `runcourier-airbill-${tn || "shipment"}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
          downloaded = true;
        } catch {
          downloaded = false;
        }
      }
      if (!downloaded && (tn || orderId)) {
        try {
          const { downloadRunCourierLabelPdf } = await import("@/lib/downloadRunCourierLabelPdf");
          await downloadRunCourierLabelPdf({ orderId, trackingNumber: tn });
          downloaded = true;
        } catch {
          downloaded = false;
        }
      }
      if (downloaded) toast.success("Airbill PDF downloaded");
      else if (!data.hasLabel && !data.label) {
        toast("Booked — airbill not ready yet. Use Download Label when available.");
      }
      onBooked?.(data);
    } catch {
      setError("Network error");
      toast.error("Network error");
    } finally {
      setBooking(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    fontSize: 13,
    background: "#fff",
    color: "#111827",
  };

  return (
    <div style={{ marginTop: 8 }}>
      {success ? (
        <div
          style={{
            padding: "12px 16px",
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 8,
            color: "#16A34A",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {success}
        </div>
      ) : null}
      {error ? (
        <div
          style={{
            padding: "12px 16px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            color: "#B91C1C",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          background: "#ECFDF5",
          border: "1px solid #A7F3D0",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#065F46" }}>
          Review Run Courier Shipment{rebook ? " (Re-book)" : ""}
        </h4>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            color: "#374151",
          }}
        >
          <div>
            <strong>Customer:</strong> {order?.shippingAddress?.name || order?.customer?.name}
          </div>
          <div>
            <strong>Phone:</strong> {order?.shippingAddress?.phone || order?.customer?.phone}
          </div>
          <div>
            <strong>City:</strong> {order?.shippingAddress?.city}
          </div>
          <div>
            <strong>Address:</strong> {order?.shippingAddress?.street}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Select API (courier company) *
            </label>
            <select
              value={selectedApi}
              onChange={(e) => setSelectedApi(e.target.value)}
              style={inputStyle}
            >
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280" }}>
              Run Courier routes the parcel through this carrier (same as portal Select API).
            </p>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Product type
            </label>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} style={inputStyle}>
              {RUN_COURIER_PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Service type
            </label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} style={inputStyle}>
              {RUN_COURIER_SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              COD Amount (Rs.)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={codAmount}
              onChange={(e) => {
                codManual.current = true;
                setCodAmount(Math.max(0, Math.round(Number(e.target.value) || 0)));
              }}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Weight (kg)
            </label>
            <input
              type="number"
              min={0.5}
              step={0.1}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Pieces
            </label>
            <input
              type="number"
              min={1}
              value={pieces}
              onChange={(e) => setPieces(Math.max(1, Number(e.target.value) || 1))}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Remarks
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={booking || !selectedApi}
            onClick={handleBook}
            style={{
              background: booking ? "#9CA3AF" : "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: booking ? "wait" : "pointer",
            }}
          >
            {booking ? "Booking…" : rebook ? "Re-book with Run Courier" : "Book with Run Courier"}
          </button>
          {onCancelForm ? (
            <button
              type="button"
              onClick={onCancelForm}
              style={{
                background: "#fff",
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                padding: "10px 16px",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
