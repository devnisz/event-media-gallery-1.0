"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";

import { SharedMediaStandalone } from "@/components/public/shared-media-standalone";
import {
  buildGalleryReturnHref,
  setGalleryFocusMedia,
} from "@/lib/gallery/gallery-scroll-restore";
import { preloadEventMedia } from "@/lib/gallery/preload-media";
import { suggestedDownloadFileName } from "@/lib/media/suggestedDownloadFileName";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

const SWIPE_THRESHOLD_PX = 48;
const SLIDE_MS = 280;

type MediaViewerNavigatorProps = {
  items: EventMedia[];
  initialIndex: number;
  eventHref: string;
  eventSlug: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

export function MediaViewerNavigator({
  items,
  initialIndex,
  eventHref,
  eventSlug,
  allowLikes,
  allowMediaShare,
}: MediaViewerNavigatorProps) {
  const router = useRouter();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchActive = useRef(false);

  const safeInitial = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, items.length - 1),
  );

  const [activeIndex, setActiveIndex] = useState(safeInitial);
  const [slideDirection, setSlideDirection] = useState<0 | 1 | -1>(0);
  const activeIndexRef = useRef(safeInitial);
  const isAnimatingRef = useRef(false);

  const total = items.length;
  const current = items[activeIndex];
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;

  const galleryReturnHref = buildGalleryReturnHref(
    eventHref,
    eventSlug,
    current?.id ?? "",
  );

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goToIndex = useCallback((nextIndex: number, direction: 1 | -1) => {
    if (isAnimatingRef.current) {
      return;
    }

    if (nextIndex < 0 || nextIndex >= total) {
      return;
    }

    if (nextIndex === activeIndexRef.current) {
      return;
    }

    isAnimatingRef.current = true;
    setSlideDirection(direction);

    window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setSlideDirection(0);
      isAnimatingRef.current = false;
    }, SLIDE_MS);
  }, [total]);

  const goPrev = useCallback(() => {
    goToIndex(activeIndexRef.current - 1, -1);
  }, [goToIndex]);

  const goNext = useCallback(() => {
    goToIndex(activeIndexRef.current + 1, 1);
  }, [goToIndex]);

  const returnToGallery = useCallback(() => {
    if (current) {
      setGalleryFocusMedia(eventSlug, current.id);
    }

    router.push(galleryReturnHref);
  }, [current, eventSlug, galleryReturnHref, router]);

  useEffect(() => {
    if (!current) {
      return;
    }

    preloadEventMedia(items[activeIndex - 1]);
    preloadEventMedia(items[activeIndex + 1]);
    setGalleryFocusMedia(eventSlug, current.id);

    const nextUrl = routes.video(current.id);

    if (window.location.pathname !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activeIndex, current, eventSlug, items]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
          return;
        }

        event.preventDefault();
        returnToGallery();
        return;
      }

      if (event.key === "ArrowLeft" && canGoPrev) {
        event.preventDefault();
        goPrev();
        return;
      }

      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoNext, canGoPrev, goNext, goPrev, returnToGallery]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (total <= 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchActive.current = true;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touchActive.current || total <= 1) {
      return;
    }

    touchActive.current = false;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return;
    }

    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.85) {
      return;
    }

    if (deltaX < 0 && canGoNext) {
      goNext();
      return;
    }

    if (deltaX > 0 && canGoPrev) {
      goPrev();
    }
  }

  if (!current) {
    return null;
  }

  const slideClass =
    slideDirection === 1
      ? "animate-media-slide-in-right"
      : slideDirection === -1
        ? "animate-media-slide-in-left"
        : "";

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {total > 1 && canGoPrev ? (
        <button
          type="button"
          aria-label="Mídia anterior"
          onClick={goPrev}
          className="absolute left-0 top-0 z-20 hidden h-full w-[min(18%,5rem)] cursor-w-resize bg-transparent md:block"
        />
      ) : null}
      {total > 1 && canGoNext ? (
        <button
          type="button"
          aria-label="Próxima mídia"
          onClick={goNext}
          className="absolute right-0 top-0 z-20 hidden h-full w-[min(18%,5rem)] cursor-e-resize bg-transparent md:block"
        />
      ) : null}

      <div
        className="media-viewer-swipe relative flex min-h-0 flex-1 flex-col"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          key={current.id}
          className={`flex min-h-0 flex-1 flex-col ${slideClass}`}
        >
          <SharedMediaStandalone
            media={current}
            eventHref={galleryReturnHref}
            eventSlug={eventSlug}
            onBackToGallery={returnToGallery}
            downloadFileName={suggestedDownloadFileName(current)}
            allowLikes={allowLikes}
            allowMediaShare={allowMediaShare}
            positionIndex={activeIndex + 1}
            positionTotal={total}
            enableNavigation={total > 1}
          />
        </div>
      </div>
    </div>
  );
}
