"use client";

import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { SharedMediaStandalone } from "@/components/public/shared-media-standalone";
import { StandaloneMediaChrome } from "@/components/public/standalone-media-chrome";
import {
  buildGalleryReturnHref,
  setGalleryFocusMedia,
} from "@/lib/gallery/gallery-scroll-restore";
import {
  markMediaOpenPhase,
  notifyMediaOpenCarouselReady,
} from "@/lib/gallery/media-open-perf";
import { preloadEventMedia } from "@/lib/gallery/preload-media";
import { suggestedDownloadFileName } from "@/lib/media/suggestedDownloadFileName";
import { trackMediaView } from "@/lib/analytics/track-client";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

const SNAP_MS = 300;
const SNAP_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const SNAP_TRANSITION = `transform ${SNAP_MS}ms ${SNAP_EASING}`;
const COMMIT_RATIO = 0.22;
const MIN_COMMIT_PX = 56;
const RUBBER_BAND = 0.35;
const AXIS_LOCK_PX = 8;
const HORIZONTAL_LOCK_RATIO = 0.85;

/** Índice fixo da mídia atual no trilho [anterior, atual, próxima]. */
const CURRENT_SLOT = 1;

type MediaViewerNavigatorProps = {
  items: EventMedia[];
  initialMediaId: string;
  eventHref: string;
  eventSlug: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

function indexForMediaId(items: EventMedia[], mediaId: string): number {
  const trimmed = mediaId.trim();

  if (!trimmed) {
    return 0;
  }

  const index = items.findIndex((item) => item.id === trimmed);
  return index >= 0 ? index : 0;
}

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: "x" | "y" | null;
  captured: boolean;
};

function isSwipeBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, [role='button'], [data-no-swipe]",
    ),
  );
}

function restTranslate(viewportWidth: number): number {
  return -CURRENT_SLOT * viewportWidth;
}

function applyRubberBand(
  delta: number,
  canGoPrev: boolean,
  canGoNext: boolean,
): number {
  if (delta > 0 && !canGoPrev) {
    return delta * RUBBER_BAND;
  }

  if (delta < 0 && !canGoNext) {
    return delta * RUBBER_BAND;
  }

  return delta;
}

export function MediaViewerNavigator({
  items,
  initialMediaId,
  eventHref,
  eventSlug,
  allowLikes,
  allowMediaShare,
}: MediaViewerNavigatorProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragRafRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const mountLoggedRef = useRef(false);
  const viewportMeasuredRef = useRef(false);
  const lastTrackedViewIdRef = useRef<string | null>(null);

  const focalMediaIdRef = useRef(initialMediaId.trim());

  const [activeIndex, setActiveIndex] = useState(() =>
    indexForMediaId(items, initialMediaId),
  );
  const [viewportWidth, setViewportWidth] = useState(0);

  const total = items.length;
  const current = items[activeIndex];
  const prevMedia = activeIndex > 0 ? items[activeIndex - 1] : null;
  const nextMedia =
    activeIndex < total - 1 ? items[activeIndex + 1] : null;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;

  const galleryReturnHref = buildGalleryReturnHref(
    eventHref,
    eventSlug,
    current?.id ?? "",
  );

  const setTrackPosition = useCallback(
    (translateX: number, animate: boolean) => {
      const track = trackRef.current;

      if (!track) {
        return;
      }

      track.style.transition = animate ? SNAP_TRANSITION : "none";
      track.style.transform = `translate3d(${translateX}px, 0, 0)`;
    },
    [],
  );

  const resetTrackToRest = useCallback(
    (animate = false) => {
      const width = viewportRef.current?.clientWidth ?? viewportWidth;

      if (width <= 0) {
        return;
      }

      setTrackPosition(restTranslate(width), animate);
    },
    [setTrackPosition, viewportWidth],
  );

  useEffect(() => {
    if (mountLoggedRef.current) {
      return;
    }

    mountLoggedRef.current = true;
    markMediaOpenPhase("viewer-mounted", {
      itemCount: items.length,
      initialMediaId: initialMediaId.trim(),
      initialIndex: indexForMediaId(items, initialMediaId),
      isCarousel: items.length > 1,
    });

    if (items.length <= 1) {
      notifyMediaOpenCarouselReady({ mode: "single-item" });
    }
  }, [initialMediaId, items.length]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const mediaId = current?.id?.trim();

    if (!mediaId || lastTrackedViewIdRef.current === mediaId) {
      return;
    }

    lastTrackedViewIdRef.current = mediaId;
    trackMediaView(mediaId);
  }, [current?.id]);

  useLayoutEffect(() => {
    const focalId = focalMediaIdRef.current.trim();

    if (!focalId) {
      return;
    }

    const nextIndex = items.findIndex((item) => item.id === focalId);

    if (nextIndex >= 0) {
      if (nextIndex !== activeIndexRef.current) {
        setActiveIndex(nextIndex);
      }
      return;
    }

    if (items.length === 0) {
      return;
    }

    focalMediaIdRef.current = items[0].id;
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    if (isDraggingRef.current || isAnimatingRef.current) {
      return;
    }

    resetTrackToRest(false);

    if (viewportWidth > 0 && viewportMeasuredRef.current) {
      notifyMediaOpenCarouselReady({ viewportWidth });
    }
  }, [activeIndex, resetTrackToRest, viewportWidth]);

  useEffect(() => {
    const node = viewportRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      const width = node.clientWidth;

      if (width > 0 && !viewportMeasuredRef.current) {
        viewportMeasuredRef.current = true;
        markMediaOpenPhase("carousel-viewport-measured", { width });
      }

      setViewportWidth(width);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
    },
    [],
  );

  const completeTransition = useCallback(
    (direction: 1 | -1) => {
      const width = viewportRef.current?.clientWidth ?? viewportWidth;

      if (width <= 0 || isAnimatingRef.current) {
        return;
      }

      isAnimatingRef.current = true;
      isDraggingRef.current = false;
      dragRef.current = null;

      const target =
        direction === 1
          ? restTranslate(width) - width
          : restTranslate(width) + width;

      setTrackPosition(target, true);

      window.setTimeout(() => {
        flushSync(() => {
          setActiveIndex((index) => {
            const nextIndex = index + direction;
            const nextMediaId = items[nextIndex]?.id;

            if (nextMediaId) {
              focalMediaIdRef.current = nextMediaId;
            }

            return nextIndex;
          });
        });

        resetTrackToRest(false);
        isAnimatingRef.current = false;
      }, SNAP_MS);
    },
    [resetTrackToRest, setTrackPosition, viewportWidth],
  );

  const snapBack = useCallback(() => {
    resetTrackToRest(true);
  }, [resetTrackToRest]);

  const commitTo = useCallback(
    (direction: 1 | -1) => {
      if (direction === 1 && !canGoNext) {
        return;
      }

      if (direction === -1 && !canGoPrev) {
        return;
      }

      completeTransition(direction);
    },
    [canGoNext, canGoPrev, completeTransition],
  );

  const returnToGallery = useCallback(() => {
    const mediaId = items[activeIndexRef.current]?.id;

    if (mediaId) {
      setGalleryFocusMedia(eventSlug, mediaId);
    }

    router.push(buildGalleryReturnHref(eventHref, eventSlug, mediaId ?? ""));
  }, [eventHref, eventSlug, items, router]);

  useEffect(() => {
    if (!current) {
      return;
    }

    preloadEventMedia(items[activeIndex - 1], "prev");
    preloadEventMedia(current, "current");
    preloadEventMedia(items[activeIndex + 1], "next");
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

      if (isDraggingRef.current || isAnimatingRef.current) {
        return;
      }

      if (event.key === "ArrowLeft" && canGoPrev) {
        event.preventDefault();
        commitTo(-1);
        return;
      }

      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        commitTo(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoNext, canGoPrev, commitTo, returnToGallery]);

  const scheduleDragPosition = useCallback(
    (translateX: number) => {
      if (dragRafRef.current !== null) {
        return;
      }

      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        setTrackPosition(translateX, false);
      });
    },
    [setTrackPosition],
  );

  const releasePointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (
        drag?.captured &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        drag.captured = false;
      }
    },
    [],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (total <= 1 || isAnimatingRef.current) {
        return;
      }

      if (event.button !== 0 || isSwipeBlockedTarget(event.target)) {
        return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: null,
        captured: false,
      };
    },
    [total],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId || isAnimatingRef.current) {
        return;
      }

      const width = viewportRef.current?.clientWidth ?? viewportWidth;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (drag.axis === null) {
        if (Math.abs(deltaX) < AXIS_LOCK_PX && Math.abs(deltaY) < AXIS_LOCK_PX) {
          return;
        }

        drag.axis =
          Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_LOCK_RATIO
            ? "x"
            : "y";

        if (drag.axis === "x" && !drag.captured) {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.captured = true;
          isDraggingRef.current = true;
        }
      }

      if (drag.axis === "y" || width <= 0) {
        return;
      }

      event.preventDefault();

      const offset = applyRubberBand(deltaX, canGoPrev, canGoNext);
      scheduleDragPosition(restTranslate(width) + offset);
    },
    [canGoNext, canGoPrev, scheduleDragPosition, viewportWidth],
  );

  const endPointerDrag = useCallback(
    (clientX: number, event?: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag || isAnimatingRef.current) {
        return;
      }

      if (event) {
        releasePointerCapture(event);
      }

      const width = viewportRef.current?.clientWidth ?? viewportWidth;
      const deltaX = clientX - drag.startX;
      const axis = drag.axis;

      dragRef.current = null;
      isDraggingRef.current = false;

      if (axis !== "x" || width <= 0) {
        snapBack();
        return;
      }

      const threshold = Math.max(MIN_COMMIT_PX, width * COMMIT_RATIO);

      if (deltaX <= -threshold && canGoNext) {
        completeTransition(1);
        return;
      }

      if (deltaX >= threshold && canGoPrev) {
        completeTransition(-1);
        return;
      }

      snapBack();
    },
    [
      canGoNext,
      canGoPrev,
      completeTransition,
      releasePointerCapture,
      snapBack,
      viewportWidth,
    ],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      endPointerDrag(event.clientX, event);
    },
    [endPointerDrag],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      endPointerDrag(event.clientX, event);
    },
    [endPointerDrag],
  );

  if (!current) {
    return null;
  }

  if (total <= 1) {
    return (
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <SharedMediaStandalone
          media={current}
          eventHref={galleryReturnHref}
          eventSlug={eventSlug}
          onBackToGallery={returnToGallery}
          downloadFileName={suggestedDownloadFileName(current)}
          allowLikes={allowLikes}
          allowMediaShare={allowMediaShare}
          perfSlot="standalone"
        />
      </div>
    );
  }

  const slideWidth = viewportWidth > 0 ? viewportWidth : "100%";

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {canGoPrev ? (
        <button
          type="button"
          aria-label="Mídia anterior"
          onClick={() => commitTo(-1)}
          className="absolute left-0 top-0 z-40 hidden h-full w-[min(18%,5rem)] cursor-w-resize bg-transparent md:block"
        />
      ) : null}
      {canGoNext ? (
        <button
          type="button"
          aria-label="Próxima mídia"
          onClick={() => commitTo(1)}
          className="absolute right-0 top-0 z-40 hidden h-full w-[min(18%,5rem)] cursor-e-resize bg-transparent md:block"
        />
      ) : null}

      <div
        ref={viewportRef}
        className="media-viewer-swipe relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          ref={trackRef}
          className="flex h-full will-change-transform"
          style={{
            transform: `translate3d(${restTranslate(viewportWidth)}px, 0, 0)`,
          }}
        >
          <CarouselSlot
            key="carousel-prev"
            media={prevMedia}
            width={slideWidth}
            isActive={false}
            perfSlot="adjacent"
            eventHref={galleryReturnHref}
            eventSlug={eventSlug}
            onBackToGallery={returnToGallery}
            allowLikes={allowLikes}
            allowMediaShare={allowMediaShare}
          />
          <CarouselSlot
            key="carousel-current"
            media={current}
            width={slideWidth}
            isActive
            perfSlot="current"
            eventHref={galleryReturnHref}
            eventSlug={eventSlug}
            onBackToGallery={returnToGallery}
            allowLikes={allowLikes}
            allowMediaShare={allowMediaShare}
          />
          <CarouselSlot
            key="carousel-next"
            media={nextMedia}
            width={slideWidth}
            isActive={false}
            perfSlot="adjacent"
            eventHref={galleryReturnHref}
            eventSlug={eventSlug}
            onBackToGallery={returnToGallery}
            allowLikes={allowLikes}
            allowMediaShare={allowMediaShare}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        <StandaloneMediaChrome
          media={current}
          eventHref={galleryReturnHref}
          eventSlug={eventSlug}
          onBackToGallery={returnToGallery}
          allowLikes={allowLikes}
          allowMediaShare={allowMediaShare}
          downloadHref={routes.mediaDownload(current.id)}
          downloadFileName={suggestedDownloadFileName(current)}
          positionIndex={activeIndex + 1}
          positionTotal={total}
          enableNavigation
        />
      </div>
    </div>
  );
}

type CarouselSlotProps = {
  media: EventMedia | null;
  width: number | string;
  isActive: boolean;
  perfSlot: "current" | "adjacent";
  eventHref: string;
  eventSlug: string;
  onBackToGallery: () => void;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

function CarouselSlot({
  media,
  width,
  isActive,
  perfSlot,
  eventHref,
  eventSlug,
  onBackToGallery,
  allowLikes,
  allowMediaShare,
}: CarouselSlotProps) {
  return (
    <div
      className={`flex h-full shrink-0 items-center justify-center ${
        isActive ? "" : "pointer-events-none"
      }`}
      style={{ width }}
      aria-hidden={!isActive || !media}
    >
      {media ? (
        <SharedMediaStandalone
          media={media}
          eventHref={eventHref}
          eventSlug={eventSlug}
          onBackToGallery={onBackToGallery}
          downloadFileName={suggestedDownloadFileName(media)}
          allowLikes={allowLikes}
          allowMediaShare={allowMediaShare}
          hideChrome
          inCarousel
          isActiveSlide={isActive}
          perfSlot={perfSlot}
        />
      ) : null}
    </div>
  );
}
