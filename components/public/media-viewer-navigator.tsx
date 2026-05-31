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
const AXIS_LOCK_PX = 8;
const SNAP_TRANSITION = `transform ${SNAP_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;

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

function isSwipeBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, video, [role='button'], [data-no-swipe]",
    ),
  );
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
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const isCommittingRef = useRef(false);
  const isDraggingHorizontallyRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const baseTranslateRef = useRef(0);
  const dragRafRef = useRef<number | null>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null as "x" | "y" | null,
    captured: false,
  });

  const safeInitial = Math.min(
    Math.max(0, initialIndex),
    Math.max(0, items.length - 1),
  );

  const [activeIndex, setActiveIndex] = useState(safeInitial);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const total = items.length;
  const current = items[activeIndex];
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;

  const slides = useMemo(
    () => buildSlides(items, activeIndex),
    [activeIndex, items],
  );
  const baseTranslate = -centerSlideIndex(activeIndex) * viewportWidth;

  const galleryReturnHref = buildGalleryReturnHref(
    eventHref,
    eventSlug,
    current?.id ?? "",
  );

  const applyTrackTransform = useCallback((transition: string) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    track.style.transition = transition;
    track.style.transform = `translate3d(${baseTranslateRef.current + dragOffsetRef.current}px, 0, 0)`;
  }, []);

  const scheduleDragTransform = useCallback(() => {
    if (dragRafRef.current !== null) {
      return;
    }

    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null;
      applyTrackTransform("none");
    });
  }, [applyTrackTransform]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    baseTranslateRef.current = baseTranslate;

    if (!isDraggingHorizontallyRef.current && !isCommittingRef.current) {
      applyTrackTransform(transitionEnabled ? SNAP_TRANSITION : "none");
    }
  }, [applyTrackTransform, baseTranslate, transitionEnabled]);

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

  useEffect(
    () => () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
    },
    [],
  );

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

  const finishIndexChange = useCallback(
    (nextIndex: number) => {
      dragOffsetRef.current = 0;
      setTransitionEnabled(false);
      setActiveIndex(nextIndex);
      isCommittingRef.current = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      });
    },
    [],
  );

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
      isDraggingHorizontallyRef.current = false;
      dragOffsetRef.current = direction === 1 ? -width : width;
      applyTrackTransform(SNAP_TRANSITION);

      window.setTimeout(() => {
        finishIndexChange(activeIndexRef.current + direction);
      }, SNAP_MS);
    },
    [applyTrackTransform, canGoNext, canGoPrev, finishIndexChange, viewportWidth],
  );

  const snapBack = useCallback(() => {
    dragOffsetRef.current = 0;
    applyTrackTransform(SNAP_TRANSITION);
  }, [applyTrackTransform]);

  const returnToGallery = useCallback(() => {
    const mediaId = items[activeIndexRef.current]?.id;

    if (mediaId) {
      setGalleryFocusMedia(eventSlug, mediaId);
    }

    const href = buildGalleryReturnHref(eventHref, eventSlug, mediaId ?? "");
    router.push(href);
  }, [eventHref, eventSlug, items, router]);

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

      if (isDraggingHorizontallyRef.current || isCommittingRef.current) {
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

  const releasePointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        dragRef.current.captured &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        dragRef.current.captured = false;
      }
    },
    [],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (total <= 1 || isCommittingRef.current) {
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
      if (
        dragRef.current.pointerId !== event.pointerId ||
        isCommittingRef.current
      ) {
        return;
      }

      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;

      if (dragRef.current.axis === null) {
        if (Math.abs(deltaX) < AXIS_LOCK_PX && Math.abs(deltaY) < AXIS_LOCK_PX) {
          return;
        }

        dragRef.current.axis =
          Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_LOCK_RATIO
            ? "x"
            : "y";

        if (dragRef.current.axis === "x" && !dragRef.current.captured) {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current.captured = true;
          isDraggingHorizontallyRef.current = true;
          setTransitionEnabled(false);
        }
      }

      if (dragRef.current.axis === "y") {
        return;
      }

      event.preventDefault();
      dragOffsetRef.current = applyRubberBand(deltaX);
      scheduleDragTransform();
    },
    [applyRubberBand, scheduleDragTransform],
  );

  const endPointerDrag = useCallback(
    (clientX: number, event?: ReactPointerEvent<HTMLDivElement>) => {
      if (isCommittingRef.current) {
        return;
      }

      if (event) {
        releasePointerCapture(event);
      }

      const axis = dragRef.current.axis;
      const width = viewportRef.current?.clientWidth ?? viewportWidth;
      const deltaX = clientX - dragRef.current.startX;

      dragRef.current.pointerId = -1;
      dragRef.current.axis = null;
      isDraggingHorizontallyRef.current = false;

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
    [
      canGoNext,
      canGoPrev,
      commitTo,
      releasePointerCapture,
      snapBack,
      viewportWidth,
    ],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId !== event.pointerId) {
        return;
      }

      endPointerDrag(event.clientX, event);
    },
    [endPointerDrag],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current.pointerId !== event.pointerId) {
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
            transform: `translate3d(${baseTranslate}px, 0, 0)`,
            transition: transitionEnabled ? SNAP_TRANSITION : "none",
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
