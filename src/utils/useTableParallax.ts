import { useEffect, useRef } from "react";

/**
 * A-001 FIX: CSS variable সরাসরি DOM-এ লেখা হয় — React state নেই, re-render নেই।
 * সাথে: converge করলে rAF লুপ ঘুমিয়ে পড়ে, মোবাইলে ও reduced-motion-এ বন্ধ।
 */
export function useTableParallax() {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    // মোবাইলে parallax বন্ধ — GPU খরচের তুলনায় লাভ নেই
    const isCoarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isCoarse || reduceMotion) return;

    let raf = 0;
    let running = false;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    const write = () => {
      el.style.setProperty("--tbl-parallax-x", `${(currentX * 12).toFixed(2)}px`);
      el.style.setProperty("--tbl-parallax-y", `${(currentY * 8).toFixed(2)}px`);
      el.style.setProperty("--tbl-tilt-x", `${(-currentY * 3.5).toFixed(2)}deg`);
      el.style.setProperty("--tbl-tilt-y", `${(currentX * 5.0).toFixed(2)}deg`);
    };

    const loop = () => {
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      write();

      // converge হলে লুপ বন্ধ — CPU ছেড়ে দেয়
      if (Math.abs(targetX - currentX) < 0.001 && Math.abs(targetY - currentY) < 0.001) {
        currentX = targetX;
        currentY = targetY;
        write();
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };

    const onMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1200;
      const h = window.innerHeight || 800;
      targetX = Math.max(-1, Math.min(1, (e.clientX - w / 2) / (w / 2)));
      targetY = Math.max(-1, Math.min(1, (e.clientY - h / 2) / (h / 2)));
      kick();
    };

    // ট্যাব লুকালে বন্ধ
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        kick();
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { tableRef };
}
