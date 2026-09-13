"use client";

import { useEffect } from "react";
import { persistUtm, readUtm } from "@/lib/utm";

/**
 * Records the campaign that produced this visit, once, on first touch.
 * Renders nothing — it exists so every booking can be attributed to the ad
 * that paid for it.
 */
export function UtmCatcher() {
  useEffect(() => {
    persistUtm(readUtm(window.location.search, document.referrer, window.location.pathname));
  }, []);
  return null;
}
