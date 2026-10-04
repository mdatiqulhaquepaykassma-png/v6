import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, ShieldAlert, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  resetting: boolean;
  resetSuccess: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    resetting: false,
    resetSuccess: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = "/";
    }
  };

  private handleDeepRecovery = async () => {
    this.setState({ resetting: true });
    try {
      // 1. Clear caches
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      // 2. Unregister service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }

      // 3. Clear potentially corrupted state in localStorage while retaining core preferences if possible
      const coreKeys = ["dt_balance_type", "dt_username", "dt_user_id"];
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !coreKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      // Clear specific problem-causers first
      localStorage.removeItem("active_game_state");
      localStorage.removeItem("dt_user_profile_backup");
      localStorage.removeItem("player_session_id");
      
      // Remove other keys
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });

      // Clear session storage completely
      try {
        sessionStorage.clear();
      } catch {}

      this.setState({ resetSuccess: true });

      // Clean redirect to clear cache and reload fresh
      setTimeout(() => {
        window.location.href = "/?recovery=" + Date.now();
      }, 1200);

    } catch (err) {
      console.error("Recovery failed:", err);
      // Fallback redirect
      window.location.href = "/";
    } finally {
      this.setState({ resetting: false });
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev }));
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || "Unknown rendering exception";
      const componentStack = this.state.errorInfo?.componentStack || "";

      return (
        <div className="min-h-[100dvh] w-full bg-[#02050b] text-neutral-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-neutral-950 select-none">
          {/* Ambient Glows */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/10 blur-[100px] rounded-full" />
          </div>

          <div className="max-w-md w-full bg-neutral-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center space-y-5 backdrop-blur-xl">
            {/* Logo and Icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.4)] bg-black">
                <BrandLogo priority alt="APEX Dragon Tiger" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold uppercase tracking-wider font-mono">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>সিস্টেম রিকভারি মোড (Recovery UI)</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                অ্যাপ লোড করতে সাময়িক সমস্যা হয়েছে
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
                একটি অপ্রত্যাশিত রেন্ডারিং ত্রুটি ঘটেছে। আপনার ব্যালেন্স ও ডাটা সম্পূর্ণ সুরক্ষিত রয়েছে। নিচের অপশনগুলো ব্যবহার করে সহজেই সমাধান করুন।
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              {/* Option 1: Quick Reload */}
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>পুনরায় লোড করুন (Quick Reload)</span>
              </button>

              {/* Option 2: Hard Recovery (Reset States/Cache) */}
              <button
                type="button"
                onClick={this.handleDeepRecovery}
                disabled={this.state.resetting || this.state.resetSuccess}
                className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl border flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95 ${
                  this.state.resetSuccess
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-300 hover:text-red-200"
                }`}
              >
                {this.state.resetSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>রিসেট সফল! রিবুট হচ্ছে...</span>
                  </>
                ) : this.state.resetting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin text-red-400" />
                    <span>মেমোরি ও ক্যাশ পরিষ্কার হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>মেমোরি ও ক্যাশ রিসেট (Hard Recovery)</span>
                  </>
                )}
              </button>

              {/* Option 3: Standard Back To Home */}
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = "/";
                }}
                className="w-full py-2 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 font-bold text-xs rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>হোমপেজে যান (Home Screen)</span>
              </button>
            </div>

            {/* Diagnostic Details Accordion */}
            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-black/30">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="w-full py-2 px-3 flex items-center justify-between text-neutral-500 hover:text-neutral-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                <span>Diagnostic Technical Details</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              
              {this.state.showDetails && (
                <div className="p-3 text-left border-t border-neutral-800 bg-neutral-950/80 text-[9px] font-mono text-red-400 max-h-48 overflow-y-auto scrollbar-thin select-text selection:bg-red-500/30">
                  <p className="font-bold text-[10px] text-red-300 mb-1 leading-snug">
                    Error: {errorMsg}
                  </p>
                  <pre className="whitespace-pre-wrap leading-relaxed text-neutral-400">
                    {componentStack || "No stack trace recorded."}
                  </pre>
                </div>
              )}
            </div>

            <div className="text-[9px] text-neutral-500 font-mono tracking-wider">
              APEX CASINO • 100% Provably Fair &amp; Secure
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
