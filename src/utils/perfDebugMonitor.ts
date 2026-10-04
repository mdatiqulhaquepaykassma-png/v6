/**
 * Hidden Performance Debug Monitor
 * Tracks real-time memory usage (performance.memory) and active component render counts,
 * logging directly to the browser console to pinpoint interactions triggering OOM errors.
 */

import { useEffect, useRef } from "react";

export interface MemorySnapshot {
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentageUsed: number;
  timestamp: number;
}

export interface RenderStat {
  componentName: string;
  totalRenders: number;
  recentRenders: number; // in last 3 seconds
  lastRenderTime: number;
  renderHistory: number[];
}

class PerfDebugMonitor {
  private static instance: PerfDebugMonitor;
  private renderCounts: Map<string, RenderStat> = new Map();
  private lastMemorySnapshot: MemorySnapshot | null = null;
  private intervalId: any = null;
  private isEnabled: boolean = true;
  private memoryThresholdAlertMB: number = 380; // 75% of 512MB
  private lastLoggedAction: string = "initial_mount";

  private constructor() {
    if (typeof window !== "undefined") {
      // Check query param (?debug=perf) or localStorage or default enabled for development
      const searchParams = new URLSearchParams(window.location.search);
      const isParamDebug = searchParams.get("debug") === "perf";
      const isStoredDebug = localStorage.getItem("apex_perf_monitor") !== "false";
      this.isEnabled = isParamDebug || isStoredDebug;

      // Expose global window API for developer inspection in DevTools
      (window as any).__APEX_PERF__ = {
        getMemory: () => this.getMemoryUsage(),
        getRenders: () => this.getRenderSummary(),
        snapshot: () => this.logSnapshot("Manual DevTools Snapshot"),
        start: () => this.start(),
        stop: () => this.stop(),
        clear: () => this.clear(),
        setThreshold: (mb: number) => { this.memoryThresholdAlertMB = mb; },
      };

      if (this.isEnabled) {
        this.start();
        this.attachInteractionListener();
        console.log(
          "%c[APEX PERF MONITOR]%c Hidden Memory & Render Tracker Active. Type %c__APEX_PERF__.snapshot()%c in console anytime for live metrics.",
          "background:#10B981; color:#000; font-weight:bold; padding:2px 6px; border-radius:4px;",
          "color:#34D399; font-weight:bold; margin-left:4px;",
          "background:#1E293B; color:#F59E0B; padding:1px 4px; border-radius:3px; font-family:monospace;",
          "color:#94A3B8;"
        );
      }
    }
  }

  public static getInstance(): PerfDebugMonitor {
    if (!PerfDebugMonitor.instance) {
      PerfDebugMonitor.instance = new PerfDebugMonitor();
    }
    return PerfDebugMonitor.instance;
  }

  public isMonitoring(): boolean {
    return this.isEnabled;
  }

  public getMemoryUsage(): MemorySnapshot | null {
    if (typeof window === "undefined" || !("performance" in window)) return null;

    const perf = window.performance as any;
    if (!perf.memory) {
      return null;
    }

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;
    const bytesToMB = (bytes: number) => Number((bytes / (1024 * 1024)).toFixed(2));

    const usedMB = bytesToMB(usedJSHeapSize);
    const totalMB = bytesToMB(totalJSHeapSize);
    const limitMB = bytesToMB(jsHeapSizeLimit);
    const percentageUsed = Number(((usedMB / limitMB) * 100).toFixed(1));

    return {
      usedMB,
      totalMB,
      limitMB,
      percentageUsed,
      timestamp: Date.now(),
    };
  }

  public trackRender(componentName: string, meta?: any) {
    if (!this.isEnabled) return;

    const now = Date.now();
    let stat = this.renderCounts.get(componentName);

    if (!stat) {
      stat = {
        componentName,
        totalRenders: 1,
        recentRenders: 1,
        lastRenderTime: now,
        renderHistory: [now],
      };
      this.renderCounts.set(componentName, stat);
    } else {
      stat.totalRenders += 1;
      stat.lastRenderTime = now;
      stat.renderHistory.push(now);

      // Keep only renders in the last 3000ms
      stat.renderHistory = stat.renderHistory.filter((t) => now - t <= 3000);
      stat.recentRenders = stat.renderHistory.length;

      // Detect rapid re-render cascade / infinite loop (>25 renders in 3s)
      if (stat.recentRenders > 25 && stat.recentRenders % 15 === 0) {
        console.warn(
          `%c[PERF WARNING]%c Component <${componentName}/> re-rendered ${stat.recentRenders} times in 3 seconds! High render churn contributes to heap allocations.`,
          "background:#EF4444; color:#FFF; font-weight:bold; padding:2px 4px; border-radius:3px;",
          "color:#F87171; font-weight:bold; margin-left:4px;",
          meta || ""
        );
      }
    }
  }

  public recordInteraction(actionDescription: string) {
    this.lastLoggedAction = actionDescription;
    const currentMemory = this.getMemoryUsage();

    if (currentMemory && this.lastMemorySnapshot) {
      const deltaMB = Number((currentMemory.usedMB - this.lastMemorySnapshot.usedMB).toFixed(2));

      // If memory grew by > 5MB on this interaction or usage is near 512MB threshold
      if (deltaMB >= 4 || currentMemory.usedMB >= this.memoryThresholdAlertMB) {
        this.logInteractionMemorySurge(actionDescription, deltaMB, currentMemory);
      }
    }

    if (currentMemory) {
      this.lastMemorySnapshot = currentMemory;
    }
  }

  private logInteractionMemorySurge(action: string, deltaMB: number, mem: MemorySnapshot) {
    const isWarning = mem.usedMB >= this.memoryThresholdAlertMB;
    const badgeColor = isWarning ? "#DC2626" : "#D97706";
    const deltaSign = deltaMB >= 0 ? `+${deltaMB}` : `${deltaMB}`;

    console.groupCollapsed(
      `%c[PERF SURGE]%c Action: "${action}" | Heap: ${mem.usedMB} MB (${deltaSign} MB) | ${mem.percentageUsed}% of limit`,
      `background:${badgeColor}; color:#FFF; font-weight:bold; padding:2px 6px; border-radius:3px;`,
      `color:${isWarning ? "#EF4444" : "#F59E0B"}; font-weight:bold;`
    );

    console.log("Memory Details:", {
      used: `${mem.usedMB} MB`,
      allocatedTotal: `${mem.totalMB} MB`,
      heapLimit: `${mem.limitMB} MB`,
      limitPercent: `${mem.percentageUsed}%`,
    });

    console.log("Top Active Component Renders in Last 3s:");
    console.table(
      Array.from(this.renderCounts.values())
        .filter((r) => r.recentRenders > 0)
        .sort((a, b) => b.recentRenders - a.recentRenders)
        .slice(0, 8)
        .map((r) => ({
          Component: r.componentName,
          "Total Renders": r.totalRenders,
          "Renders (Last 3s)": r.recentRenders,
        }))
    );

    if (isWarning) {
      console.warn(
        `🚨 CRITICAL: JS Heap is at ${mem.usedMB} MB, approaching 512MB RAM cap. Review uncleaned event listeners, canvas contexts, or re-render churn in top components.`
      );
    }

    console.groupEnd();
  }

  public logSnapshot(label: string = "Scheduled Performance Heartbeat") {
    const mem = this.getMemoryUsage();
    const sortedRenders = Array.from(this.renderCounts.values())
      .sort((a, b) => b.totalRenders - a.totalRenders)
      .slice(0, 10);

    const memLabel = mem
      ? `Heap: ${mem.usedMB} MB / ${mem.limitMB} MB (${mem.percentageUsed}%)`
      : "performance.memory not available in this browser";

    console.groupCollapsed(
      `%c[PERF MONITOR]%c ${label} • ${memLabel}`,
      "background:#2563EB; color:#FFF; font-weight:bold; padding:2px 5px; border-radius:3px;",
      "color:#60A5FA; font-weight:bold;"
    );

    if (mem) {
      console.log("📊 Real-time Memory Usage:", {
        "Used Heap": `${mem.usedMB} MB`,
        "Total Heap Allocated": `${mem.totalMB} MB`,
        "Max Heap Limit": `${mem.limitMB} MB`,
        "Utilization %": `${mem.percentageUsed}%`,
      });
    }

    console.log("🔥 Top Active Rendered Components:");
    console.table(
      sortedRenders.map((r) => ({
        Component: r.componentName,
        "Total Renders": r.totalRenders,
        "Recent (3s)": r.recentRenders,
        "Last Rendered": `${Math.round((Date.now() - r.lastRenderTime) / 1000)}s ago`,
      }))
    );

    console.groupEnd();
  }

  public getRenderSummary() {
    return Array.from(this.renderCounts.values()).map((r) => ({
      component: r.componentName,
      totalRenders: r.totalRenders,
      recentRenders: r.recentRenders,
    }));
  }

  private attachInteractionListener() {
    if (typeof window === "undefined") return;

    // Track user clicks and UI interactions without overhead
    const handleGlobalInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const button = target.closest("button, a, [role='button'], input, select");
      if (button) {
        const text = (button.textContent || "").trim().slice(0, 30);
        const aria = button.getAttribute("aria-label") || "";
        const title = button.getAttribute("title") || "";
        const tag = button.tagName.toLowerCase();
        const actionDesc = `${tag}: "${text || aria || title || button.className.slice(0, 20)}"`;
        this.recordInteraction(actionDesc);
      }
    };

    window.addEventListener("click", handleGlobalInteraction, { passive: true, capture: true });
  }

  public start(intervalMs: number = 8000) {
    this.isEnabled = true;
    if (this.intervalId) clearInterval(this.intervalId);

    // Initial snapshot after startup
    setTimeout(() => {
      this.lastMemorySnapshot = this.getMemoryUsage();
      this.logSnapshot("Initial Load Metrics");
    }, 2500);

    // Periodic heartbeat log (throttled to avoid console spam)
    this.intervalId = setInterval(() => {
      const mem = this.getMemoryUsage();
      if (!mem) return;

      // Only auto-log heartbeat if memory is high (>300MB) or has risen by >8MB
      const shouldLog =
        mem.usedMB > 300 ||
        (this.lastMemorySnapshot && Math.abs(mem.usedMB - this.lastMemorySnapshot.usedMB) >= 8);

      if (shouldLog) {
        this.logSnapshot("Periodic Memory Pulse");
      }
      this.lastMemorySnapshot = mem;
    }, intervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isEnabled = false;
    console.log("[APEX PERF MONITOR] Monitor paused.");
  }

  public clear() {
    this.renderCounts.clear();
    console.log("[APEX PERF MONITOR] Render counts reset.");
  }
}

export const perfMonitor = PerfDebugMonitor.getInstance();

/**
 * React Hook: Track Component Render Frequency & Count
 * Attach to components to monitor how many times they render and detect churn
 */
export function useRenderTracker(componentName: string, meta?: any) {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  perfMonitor.trackRender(componentName, meta);

  useEffect(() => {
    // Optional unmount logging if useful
    return () => {
      // Cleanup hook
    };
  }, [componentName]);
}
