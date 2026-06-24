"use client";

import { useEffect, useState } from "react";
import type { PosterMetrics } from "@/types";

const DEFAULT_METRICS: PosterMetrics = { width: 1280, height: 800 };

export function usePosterMetrics(): PosterMetrics {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);

  useEffect(() => {
    const el = document.getElementById("match-poster");
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMetrics({ width: rect.width, height: rect.height });
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return metrics;
}
