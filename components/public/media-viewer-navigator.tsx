"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
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
import { preloadEventMedia } from "@/lib/gallery/preload-media";
import { suggestedDownloadFileName } from "@/lib/media/suggestedDownloadFileName";
import { routes } from "@/lib/routes";
import type { EventMedia } from "@/types/media";

const SNAP_MS = 320;
const RUBBER_BAND = 0.32;
const COMMIT_RATIO = 0.22;
const MIN_COMMIT_PX = 56;
const HORIZONTAL_LOCK_RATIO = 0.85;

type MediaViewerNavigatorProps = {
  items: EventMedia[];
  initialIndex: number;
  eventHref: string;
  eventSlug: string;
  allowLikes: boolean;
  allowMediaShare: boolean;
};

function buildSlides(items: EventMedia[], index: number): EventMedia[] {
  const slides: EventMedia[] = [];

  if (index > 0) {
    slides.push(items[index - 1]);
  }

  slides.push(items[index]);

  if (index < items.length - 1) {
    slides.push(items[index + 1]);
  }

  return slides;
}

function centerSlideIndex(activeIndex: number): number {
  return activeIndex > 0 ? 1 : 0;
}

export function MediaViewerNavigator({
  items,
  initialIndex,
  eventHref,
  eventSlug,
  allowLikes,
  allowMediaShare,
}: MediaViewerNavigatorProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const isCommittingRef = useRef(false);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null as "x" | "y" | null,
  });

  const safeInitial = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, items.length - 1),
  );

  const [activeIndex, setActiveIndex] = useState(safeInitial);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const total = items.length;
  const current = items[activeIndex];
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;

  const slides = useMemo(
    () => buildSlides(items, activeIndex),
    [activeIndex, items],
  );
  const centerIndex = centerSlideIndex(activeIndex);
  const baseTranslate = -centerIndex * viewportWidth;

  const galleryReturnHref = buildGalleryReturnHref(
    eventHref,
    eventSlug,
    current?.id ?? "",
  );

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const node = viewportRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      setViewportWidth(node.clientWidth);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const applyRubberBand = useCallback(
    (delta: number) => {
      if (delta > 0 && !canGoPrev) {
        return delta * RUBBER_BAND;
      }

      if (delta < 0 && !canGoNext) {
        return delta * RUBBER_BAND;
      }

      return delta;
    },
    [canGoNext, canGoPrev],
  );

  const finishIndexChange = useCallback((nextIndex: number) => {
    setTransitionEnabled(false);
    setActiveIndex(nextIndex);
    setDragOffset(0);
    isCommittingRef.current = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
    });
  }, []);

  const commitTo = useCallback(
    (direction: 1 | -1) => {
      const width = viewportRef.current?.clientWidth ?? viewportWidth;

      if (!width || isCommittingRef.current) {
        return;
      }

      if (direction === 1 && !canGoNext) {
        return;
      }

      if (direction === -1 && !canGoPrev) {
        return;
      }

      isCommittingRef.current = true;
      setTransitionEnabled(true);
      setDragOffset(direction === 1 ? -width : width);

      window.setTimeout(() => {
        finishIndexChange(activeIndexRef.current + direction);
      }, SNAP_MS);
    },
    [canGoNext, canGoPrev, finishIndexChange, viewportWidth],
  );

  const snapBack = useCallback(() => {
    setTransitionEnabled(true);
    setDragOffset(0);
  }, []);

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

      if (isDragging || isCommittingRef.current) {
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
  }, [canGoNext, canGoPrev, commitTo, isDragging, returnToGallery]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (total <= 1 || isCommittingRef.current) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: null,
      };
      setIsDragging(true);
      setTransitionEnabled(false);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [total],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        dragRef.current.pointerId !== event.pointerId ||
        isCommittingRef.current
      ) {
        return;
      }

      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;

      if (dragRef.current.axis === null) {
        if (
          Math.abs(deltaX) < 8 &&
          Math.abs(deltaY) < 8
        ) {
          return;
        }

        dragRef.current.axis =
          Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_LOCK_RATIO
            ? "x"
            : "y";
      }

      if (dragRef.current.axis === "y") {
        return;
      }

      event.preventDefault();
      setDragOffset(applyRubberBand(deltaX));
    },
    [applyRubberBand],
  );

  const endPointerDrag = useCallback(
    (clientX: number) => {
      if (isCommittingRef.current) {
        return;
      }

      const axis = dragRef.current.axis;
      const width = viewportRef.current?.clientWidth ?? viewportWidth;
      const deltaX = clientX - dragRef.current.startX;

      dragRef.current.pointerId = -1;
      dragRef.current.axis = null;
      setIsDragging(false);

      if (axis === "y" || axis === null || width <= 0) {
        snapBack();
        setTransitionEnabled(true);
        return;
      }

      const threshold = Math.max(MIN_COMMIT_PX, width * COMMIT_RATIO);

      if (deltaX <= -threshold && canGoNext) {
        commitTo(1);
        return;
      }

      if (deltaX >= threshold && canGoPrev) {
        commitTo(-1);
        return;
      }

      snapBack();
      setTransitionEnabled(true);
    },
    [canGoNext, canGoPrev, commitTo, snapBack, viewportWidth],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId !== event.pointerId) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      endPointerDrag(event.clientX);
    },
    [endPointerDrag],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId !== event.pointerId) {
        return;
      }

      endPointerDrag(event.clientX);
    },
    [endPointerDrag],
  );

  if (!current) {
    return null;
  }

  if (total <= 1) {
    return (
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <SharedMediaStandalone
            media={current}
            eventHref={galleryReturnHref}
            eventSlug={eventSlug}
            onBackToGallery={returnToGallery}
            downloadFileName={suggestedDownloadFileName(current)}
            allowLikes={allowLikes}
            allowMediaShare={allowMediaShare}
          />
        </div>
      </div>
    );
  }

  const trackTranslate = baseTranslate + dragOffset;

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {canGoPrev ? (
        <button
          type="button"
          aria-label="Mídia anterior"
          onClick={() => commitTo(-1)}
          className="absolute left-0 top-0 z-20 hidden h-full w-[min(18%,5rem)] cursor-w-resize bg-transparent md:block"
        />
      ) : null}
      {canGoNext ? (
        <button
          type="button"
          aria-label="Próxima mídia"
          onClick={() => commitTo(1)}
          className="absolute right-0 top-0 z-20 hidden h-full w-[min(18%,5rem)] cursor-e-resize bg-transparent md:block"
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
          className="flex h-full will-change-transform"
          style={{
            transform: `translate3d(${trackTranslate}px, 0, 0)`,
            transition:
              isDragging || !transitionEnabled
                ? "none"
                : `transform ${SNAP_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
          }}
        >
          {slides.map((slide) => {
            const isActive = slide.id === current.id;

            return (
              <div
                key={slide.id}
                className={`flex h-full shrink-0 items-center justify-center ${
                  isActive ? "" : "pointer-events-none"
                }`}
                style={{
                  width: viewportWidth > 0 ? viewportWidth : "100%",
                }}
                aria-hidden={!isActive}
              >
                <SharedMediaStandalone
                  media={slide}
                  eventHref={galleryReturnHref}
                  eventSlug={eventSlug}
                  onBackToGallery={returnToGallery}
                  downloadFileName={suggestedDownloadFileName(slide)}
                  allowLikes={allowLikes}
                  allowMediaShare={allowMediaShare}
                  hideChrome
                  isActiveSlide={isActive}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="relative h-full w-full">
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
    </div>
  );
}
