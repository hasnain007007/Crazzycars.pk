/**
 * Shared marker for Edge middleware → Node AI-visit ingest.
 * Not a substitute for REVALIDATE_SECRET on public traffic; only accepted
 * together with AI-traffic classification on the ingest route.
 */
export const AI_INGEST_INTERNAL_TOKEN = "homefy-ai-ingest-internal-v1";
