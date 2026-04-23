"use client";

import { useEffect, useMemo, useRef } from "react";

type LandingHeroDemoVideoProps = {
  className?: string;
};

/**
 * Muted autoplay + loop is the browser-supported pattern for hero demos.
 * If the user prefers reduced motion, we avoid autoplay and show native controls instead.
 */
export function LandingHeroDemoVideo({ className }: LandingHeroDemoVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (prefersReducedMotion) {
      void el.pause();
      return;
    }

    const p = el.play();
    if (p && typeof p.catch === "function") {
      void p.catch(() => {
        // Autoplay can still be blocked in some edge cases; controls give a graceful fallback.
        el.controls = true;
      });
    }
  }, [prefersReducedMotion]);

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl shadow-black/40">
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          muted
          playsInline
          autoPlay={!prefersReducedMotion}
          loop={!prefersReducedMotion}
          controls={prefersReducedMotion}
          preload="metadata"
          aria-label="CardPeek product demo video"
        >
          {/* H.264 in an MPEG-4 container (`.m4v`) for broad browser autoplay support */}
          <source src="/videos/cardpeek-demo.m4v" type="video/mp4" />
        </video>
        <p className="px-4 py-3 text-center text-xs text-muted-foreground">Preview</p>
      </div>
    </div>
  );
}
