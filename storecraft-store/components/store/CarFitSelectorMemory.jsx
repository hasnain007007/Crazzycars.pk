"use client";

/** Pre-selects the saved "My car" in the nearest car selector and saves new choices. */
import { useEffect, useRef } from "react";
import { readCar } from "@/components/store/MyCar";

const KEY = "cc-my-car";

export function CarFitSelectorMemory({ hasCurrent = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const form = ref.current?.closest("form[data-car-fit-form]");
    const select = form?.querySelector("select[name=car]");
    if (!form || !select) return undefined;
    const saved = readCar();
    if (!hasCurrent && saved && [...select.options].some((o) => o.value === saved.slug)) {
      select.value = saved.slug;
    }
    const onSubmit = () => {
      const opt = select.options[select.selectedIndex];
      try {
        if (select.value) localStorage.setItem(KEY, JSON.stringify({ slug: select.value, label: opt?.text || select.value }));
      } catch {
        /* storage blocked */
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [hasCurrent]);
  return <span ref={ref} hidden />;
}
