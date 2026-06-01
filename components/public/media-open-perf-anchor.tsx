"use client";

import { useEffect } from "react";

import { markMediaOpenPhase } from "@/lib/gallery/media-open-perf";

/** Primeiro código cliente na rota /video — mede navegação + RSC até hidratação. */
export function MediaOpenPerfAnchor() {
  useEffect(() => {
    markMediaOpenPhase("viewer-page-hydrated");
  }, []);

  return null;
}
