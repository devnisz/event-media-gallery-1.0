"use client";

import { useEffect } from "react";

import { galleryMediaElementId } from "@/lib/gallery/gallery-scroll-restore";

/** Rola até a miniatura indicada no hash (#gallery-media-id). */
export function GalleryScrollRestore() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.startsWith("#gallery-media-")) {
      return;
    }

    const mediaId = decodeURIComponent(hash.slice("#gallery-media-".length));

    if (!mediaId) {
      return;
    }

    const scrollToTarget = () => {
      const target = document.getElementById(galleryMediaElementId(mediaId));

      if (!target) {
        return;
      }

      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "instant" in document.documentElement.style ? "instant" : "auto",
      });
    };

    requestAnimationFrame(() => {
      scrollToTarget();
      window.setTimeout(scrollToTarget, 120);
    });
  }, []);

  return null;
}
