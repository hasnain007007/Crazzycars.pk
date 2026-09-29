"use client";

/**
 * Standalone Run Courier booking panel for Order Detail.
 * Does not touch PostEx booking UI or handlers.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  RUN_COURIER_APIS,
  RUN_COURIER_DEFAULT_API,
  RUN_COURIER_PRODUCT_TYPES,
  RUN_COURIER_SERVICE_TYPES,
} from "@/lib/runcourier";
import RunCourierCitySelect from "@/components/runcourier/RunCourierCitySelect";

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
  const [cities, setCities] = useState([]);
  const [cityName, setCityName] = useState("");
  const [cityAudit, setCityAudit] = useState(null);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedApi, setSelectedApi] = useState(
    courierSettings.runCourierDefaultApi || order?.runCourierApi || RUN_COURIER_DEFAULT_API
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

  const originCity = useMemo(
    () =>
      String(
        courierSettings.runCourierOriginCity || courierSettings.originCity || "Gujranwala"
      ).trim(),
    [courierSettings.runCourierOriginCity, courierSettings.originCity]
  );

  useEffect(() => {
    fetch("/api/runcourier/carriers", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.carriers) && json.carriers.length) setCarriers(json.carriers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCitiesLoading(true);
    fetch("/api/runcourier/carriers?type=cities", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (Array.isArray(json.cities)) setCities(json.cities);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    setSelectedApi(
      courierSettings.runCourierDefaultApi || order?.runCourierApi || RUN_COURIER_DEFAULT_API
    );
    setCityName(String(order?.shippingAddress?.city || "").trim());
  }, [order, orderTotal, courierSettings.runCourierDefaultApi, order?.runCourierApi]);

  // Live city audit against GetCitiesList whenever destination/origin changes.
  useEffect(() => {
    const dest = String(cityName || "").trim();
    if (!dest) {
      setCityAudit(null);
      return;
    }
    const t = setTimeout(() => {
      const qs = new URLSearchParams({
        destination: dest,
        origin: originCity,
      });
      fetch(`/api/runcourier/city-audit?${qs}`, { credentials: "include" })
        .then((r) => r.json())
        .then((json) => {
          if (json?.success) setCityAudit(json);
          else setCityAudit(null);
        })
        .catch(() => setCityAudit(null));
    }, 280);
    return () => clearTimeout(t);
  }, [cityName, originCity]);

  // Once per order, snap free-text order city to the exact GetCitiesList name.
  const snappedRef = useRef("");
  useEffect(() => {
    const orderKey = String(order?.id || order?._id || "");
    if (!orderKey || !cityAudit?.destination?.ok || !cityAudit.destination.matched) return;
    if (snappedRef.current === orderKey) return;
    if (cityAudit.destination.matched !== cityName) {
      setCityName(cityAudit.destination.matched);
    }
    snappedRef.current = orderKey;
  }, [cityAudit, cityName, order?.id, order?._id]);

  async function handleBook() {
    if (!order) return;
    const dest = String(cityName || "").trim();
    if (!dest) {
      setError("Select a destination city from the Run Courier list.");
      toast.error("Destination city required");
      return;
    }
    if (cityAudit && cityAudit.destination && cityAudit.destination.ok === false) {
      const tips = (cityAudit.destination.candidates || []).slice(0, 3).join(", ");
      const msg = tips
        ? `City "${dest}" is not in Run Courier list. Try: ${tips}`
        : `City "${dest}" is not in the Run Courier availability list.`;
      setError(msg);
      toast.error(msg);
      return;
    }
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
          cityName: dest,
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
      if (data.trackingEmail === "sent") {
        toast.success("Tracking email sent to customer");
      } else if (data.trackingEmail === "failed") {
        toast.error(data.trackingEmailError || "Tracking email failed — check RESEND_API_KEY on admin");
      } else if (data.trackingEmail === "skipped") {
        toast(data.trackingEmailError || "No customer email — tracking email skipped");
      }
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
    padding: "6px 8px",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    fontSize: 13,
    background: "#fff",
    color: "#111827",
  };
  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    display: "block",
    marginBottom: 2,
    color: "#374151",
  };

  const destOk = cityAudit?.destination?.ok;
  const originOk = cityAudit?.origin?.ok;
  const auditReady = cityAudit && destOk !== null;

  return (
    <div style={{ marginTop: 6 }}>
      {success ? (
        <div
          style={{
            padding: "8px 10px",
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 6,
            color: "#16A34A",
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          {success}
        </div>
      ) : null}
      {error ? (
        <div
          style={{
            padding: "8px 10px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 6,
            color: "#B91C1C",
            fontSize: 12,
            marginBottom: 8,
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
          padding: 10,
        }}
      >
        <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#065F46" }}>
          Review Run Courier Shipment{rebook ? " (Re-book)" : ""}
        </h4>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 6,
            padding: "8px 10px",
            marginBottom: 8,
            fontSize: 12,
            color: "#374151",
            lineHeight: 1.35,
          }}
        >
          <div>
            <strong>Customer:</strong> {order?.shippingAddress?.name || order?.customer?.name} ·{" "}
            <strong>Phone:</strong> {order?.shippingAddress?.phone || order?.customer?.phone}
          </div>
          <div>
            <strong>Address:</strong> {order?.shippingAddress?.street}
          </div>
        </div>

        {/* City audit from live GetCitiesList */}
        <div
          style={{
            background: destOk === false ? "#FEF2F2" : destOk ? "#F0FDF4" : "#F8FAFC",
            border: `1px solid ${destOk === false ? "#FECACA" : destOk ? "#BBF7D0" : "#E2E8F0"}`,
            borderRadius: 6,
            padding: "8px 10px",
            marginBottom: 8,
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, color: "#065F46" }}>
            City audit (Run Courier availability list)
            {citiesLoading ? " · loading…" : cities.length ? ` · ${cities.length} cities` : ""}
          </div>
          <div style={{ color: "#374151", marginBottom: 6 }}>
            Origin: <strong>{originCity}</strong>
            {auditReady && originOk === false ? (
              <span style={{ color: "#B91C1C" }}> — not in list</span>
            ) : auditReady && originOk ? (
              <span style={{ color: "#16A34A" }}>
                {" "}
                → {cityAudit.origin.matched || originCity} ✓
              </span>
            ) : null}
            {" · "}
            Destination:{" "}
            {auditReady && destOk === false ? (
              <span style={{ color: "#B91C1C" }}>
                <strong>{cityName}</strong> not in courier list
              </span>
            ) : auditReady && destOk ? (
              <span style={{ color: "#16A34A" }}>
                <strong>{cityAudit.destination.matched || cityName}</strong> ✓
              </span>
            ) : (
              <strong>{cityName || "—"}</strong>
            )}
          </div>
          {destOk === false && (cityAudit?.destination?.candidates || []).length > 0 ? (
            <div style={{ marginBottom: 6, color: "#9A3412" }}>
              Suggestions:{" "}
              {cityAudit.destination.candidates.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCityName(c)}
                  style={{
                    marginRight: 4,
                    marginBottom: 2,
                    border: "1px solid #FDBA74",
                    background: "#FFF7ED",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: 11,
                    cursor: "pointer",
                    color: "#9A3412",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}
          <label style={labelStyle}>Destination city (from courier API) *</label>
          <RunCourierCitySelect
            cities={cities}
            value={cityName}
            onChange={setCityName}
            placeholder={citiesLoading ? "Loading cities…" : "Search Run Courier city…"}
            disabled={citiesLoading && !cities.length}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Select API (courier company) *</label>
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
          </div>

          <div>
            <label style={labelStyle}>Product type</label>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} style={inputStyle}>
              {RUN_COURIER_PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Service type</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} style={inputStyle}>
              {RUN_COURIER_SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Pieces</label>
            <input
              type="number"
              min={1}
              value={pieces}
              onChange={(e) => setPieces(Math.max(1, Number(e.target.value) || 1))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>COD Amount (Rs.)</label>
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
            <label style={labelStyle}>Weight (kg)</label>
            <input
              type="number"
              min={0.5}
              step={0.1}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ ...inputStyle, resize: "vertical", minHeight: 52 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={booking || !selectedApi || destOk === false}
            onClick={handleBook}
            style={{
              background: booking || destOk === false ? "#9CA3AF" : "#059669",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: 13,
              cursor: booking ? "wait" : destOk === false ? "not-allowed" : "pointer",
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
                padding: "8px 14px",
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
