/** JSON-LD must never 500 a shoppable page. */
export function safeJsonLd(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch (error) {
    console.error("[json-ld] stringify failed:", error);
    return "{}";
  }
}
