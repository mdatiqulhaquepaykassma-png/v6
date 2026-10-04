import { useState, useEffect } from "react";

export interface ImageResizerOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: "webp" | "avif" | "auto" | "original";
  fit?: "cover" | "contain" | "fill";
}

export interface ImageResizerResult {
  optimizedSrc: string;
  srcset?: string;
  format: "avif" | "webp" | "png" | "jpg" | "unknown";
  dpr: number;
  isLowEndDevice: boolean;
  isDataSaver: boolean;
  effectiveConnectionType: string;
}

// Global feature detection cache
let cachedWebpSupport: boolean | null = null;
let cachedAvifSupport: boolean | null = null;

export function checkWebpSupport(): Promise<boolean> {
  if (cachedWebpSupport !== null) return Promise.resolve(cachedWebpSupport);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cachedWebpSupport = img.width > 0 && img.height > 0;
      resolve(cachedWebpSupport);
    };
    img.onerror = () => {
      cachedWebpSupport = false;
      resolve(false);
    };
    img.src = "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA==";
  });
}

export function checkAvifSupport(): Promise<boolean> {
  if (cachedAvifSupport !== null) return Promise.resolve(cachedAvifSupport);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cachedAvifSupport = img.width > 0 && img.height > 0;
      resolve(cachedAvifSupport);
    };
    img.onerror = () => {
      cachedAvifSupport = false;
      resolve(false);
    };
    img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAAWbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAMDBCSAAAAAAAAAAAAAAAAAAAAAAACXBpdG0AAAAAAAEAKGFpbmYAAAAAAAEAAAAAYWdycgAAAAAAAABjb2xyY29scgAAAAABAAAAAAASAABwaXhpAAAAAABwaXhp";
  });
}

/**
 * Calculates optimal image dimensions based on device pixel ratio (DPR),
 * viewport width, network speed, and data saver settings.
 */
export function getOptimizedImageParams(
  targetWidth: number,
  options: ImageResizerOptions = {}
): { width: number; quality: number; format: "avif" | "webp" | "original" } {
  if (typeof window === "undefined") {
    return { width: targetWidth, quality: 80, format: "webp" };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const nav = navigator as unknown as {
    connection?: { effectiveType?: string; saveData?: boolean };
    deviceMemory?: number;
  };

  const conn = nav.connection;
  const ect = conn?.effectiveType || "4g";
  const saveData = conn?.saveData || false;
  const memory = nav.deviceMemory || 4;

  const isSlowNetwork = ect === "slow-2g" || ect === "2g" || ect === "3g";
  const isConstrained = isSlowNetwork || saveData || memory <= 2;

  // On low-end / constrained devices, scale down the resolution & target quality
  let scaledWidth = targetWidth * dpr;
  let quality = options.quality || 80;

  if (isConstrained) {
    scaledWidth = Math.round(targetWidth * 1.0); // 1x instead of 2x/3x DPR on constrained devices
    quality = Math.min(quality, 65);
  } else if (dpr >= 2) {
    scaledWidth = Math.round(targetWidth * 1.5); // Cap high DPR scaling at 1.5x to preserve GPU RAM
  }

  // Round to standard responsive breakpoints (320, 480, 640, 800, 1024, 1280, 1600, 1920)
  const breakpoints = [320, 480, 640, 800, 1024, 1280, 1600, 1920];
  const roundedWidth = breakpoints.find((b) => b >= scaledWidth) || scaledWidth;

  const chosenFormat = options.format === "original" ? "original" : cachedAvifSupport ? "avif" : "webp";

  return {
    width: roundedWidth,
    quality,
    format: chosenFormat,
  };
}

/**
 * Builds a dynamic responsive image URL or returns optimized path
 */
export function buildOptimizedImageUrl(src: string, options: ImageResizerOptions = {}): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;

  const targetWidth = options.width || 640;
  const params = getOptimizedImageParams(targetWidth, options);

  // If using image CDN or dynamic asset query params (e.g. /image?url=...&w=...&q=...&fmt=...)
  if (src.includes("/assets/") || src.startsWith("http")) {
    const url = new URL(src, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.searchParams.set("w", params.width.toString());
    url.searchParams.set("q", params.quality.toString());
    if (params.format !== "original") {
      url.searchParams.set("fmt", params.format);
    }
    return url.toString();
  }

  return src;
}

/**
 * Lightweight React Hook for Adaptive Image Resizing and GPU RAM optimization
 */
export function useImageResizer(
  src: string,
  options: ImageResizerOptions = {}
): ImageResizerResult {
  const [result, setResult] = useState<ImageResizerResult>(() => {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const nav = typeof navigator !== "undefined" ? (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean }; deviceMemory?: number }) : {};
    const conn = nav.connection;
    const isSaveData = Boolean(conn?.saveData);
    const ect = conn?.effectiveType || "4g";
    const memory = nav.deviceMemory || 4;
    const isLowEnd = ect === "2g" || ect === "slow-2g" || isSaveData || memory <= 2;

    return {
      optimizedSrc: src,
      format: "webp",
      dpr,
      isLowEndDevice: isLowEnd,
      isDataSaver: isSaveData,
      effectiveConnectionType: ect,
    };
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([checkWebpSupport(), checkAvifSupport()]).then(([hasWebp, hasAvif]) => {
      if (!isMounted) return;

      const dpr = window.devicePixelRatio || 1;
      const nav = navigator as unknown as {
        connection?: { effectiveType?: string; saveData?: boolean };
        deviceMemory?: number;
      };
      const conn = nav.connection;
      const isSaveData = Boolean(conn?.saveData);
      const ect = conn?.effectiveType || "4g";
      const memory = nav.deviceMemory || 4;
      const isLowEnd = ect === "2g" || ect === "slow-2g" || isSaveData || memory <= 2;

      const format: "avif" | "webp" | "png" | "jpg" = hasAvif ? "avif" : hasWebp ? "webp" : "jpg";
      const optimizedSrc = buildOptimizedImageUrl(src, { ...options, format: format === "avif" || format === "webp" ? format : "original" });

      setResult({
        optimizedSrc,
        format,
        dpr,
        isLowEndDevice: isLowEnd,
        isDataSaver: isSaveData,
        effectiveConnectionType: ect,
      });
    });

    return () => {
      isMounted = false;
    };
  }, [src, options.width, options.height, options.quality, options.format]);

  return result;
}
