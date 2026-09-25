/**
 * Low-level Meta Graph HTTP client (axios). Never logs the access token.
 */
import axios from "axios";
import { getSocialConfig } from "@/lib/social/config";
import { formatGraphError, isMetaOAuthError } from "@/lib/social/metaHalt";

const TIMEOUT_MS = 60_000;

export function graphBaseUrl(version) {
  const v = String(version || "v23.0").replace(/^\/+|\/+$/g, "");
  return `https://graph.facebook.com/${v}`;
}

/**
 * @returns {Promise<{ ok: boolean, data?: any, error?: any, dryRun?: boolean, planned?: object }>}
 */
export async function graphRequest({
  method = "GET",
  path,
  params = {},
  data,
  dryRun = false,
  label = "",
}) {
  const cfg = getSocialConfig();
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${graphBaseUrl(cfg.graphVersion)}${urlPath}`;
  const safeParams = { ...params };
  // Always attach token for real calls; never include in planned log value
  const planned = {
    label: label || `${method} ${urlPath}`,
    method,
    url,
    params: { ...safeParams, access_token: "[REDACTED]" },
    data: data || null,
  };

  if (dryRun) {
    console.info("[social:dry-run]", JSON.stringify(planned));
    return { ok: true, dryRun: true, planned, data: { id: `dry-run-${Date.now()}` } };
  }

  try {
    const res = await axios({
      method,
      url,
      params: { ...safeParams, access_token: cfg.pageToken },
      data,
      timeout: TIMEOUT_MS,
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 300 && !res.data?.error) {
      return { ok: true, data: res.data, planned };
    }
    const errBody = res.data?.error || {
      message: `HTTP ${res.status}`,
      code: res.status,
    };
    return {
      ok: false,
      error: errBody,
      message: formatGraphError({ error: errBody }),
      oauth: isMetaOAuthError({ error: errBody }),
      planned,
      status: res.status,
    };
  } catch (e) {
    const errBody = e?.response?.data?.error || {
      message: e?.message || "Network error",
      code: e?.response?.status || 0,
    };
    return {
      ok: false,
      error: errBody,
      message: formatGraphError({ error: errBody }),
      oauth: isMetaOAuthError({ error: errBody }),
      planned,
    };
  }
}

export async function verifyMetaToken() {
  const cfg = getSocialConfig();
  if (!cfg.pageToken) {
    return { ok: false, error: "META_PAGE_TOKEN missing" };
  }
  const me = await graphRequest({
    method: "GET",
    path: "/me",
    params: { fields: "id,name" },
    dryRun: false,
    label: "GET /me (page token check)",
  });
  if (!me.ok) return me;
  let ig = null;
  if (cfg.igUserId) {
    ig = await graphRequest({
      method: "GET",
      path: `/${cfg.igUserId}`,
      params: { fields: "username,name,id" },
      dryRun: false,
      label: `GET /{IG_USER_ID} username`,
    });
  }
  return {
    ok: true,
    page: me.data,
    instagram: ig?.ok ? ig.data : null,
    igError: ig && !ig.ok ? ig.message : "",
  };
}
