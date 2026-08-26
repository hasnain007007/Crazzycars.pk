"use client";

import { StoreErrorFallback } from "@/components/store/StoreErrorFallback";

export default function Error({ reset }) {
  return <StoreErrorFallback reset={reset} />;
}
