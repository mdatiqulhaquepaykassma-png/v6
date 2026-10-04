import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = "/";
    }
  };

  private handleReset = () => {
    try {
      localStorage.removeItem("active_game_state");
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full bg-[#02050b] text-neutral-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-neutral-950 select-none">
          {/* Ambient Glows */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/10 blur-[100px] rounded-full" />
          </div>

          <div className="max-w-md w-full bg-neutral-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center space-y-6 backdrop-blur-xl">
            {/* Logo and Icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.4)] bg-black">
                <img src="/app-logo.png" alt="APEX Logo" className="w-full h-full object-cover" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>সিস্টেম রিকভারি মোড (Recovery)</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                অ্যাপ লোড করতে সাময়িক সমস্যা হয়েছে
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                নিচের বাটনে চাপ দিয়ে অ্যাপটি পুনরায় রিফ্রেশ করুন। আপনার ব্যালেন্স ও ডাটা সম্পূর্ণ সুরক্ষিত রয়েছে।
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>পুনরায় চালু করুন (Reload App)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>হোমপেজে ফিরে যান</span>
              </button>
            </div>

            <div className="text-[10px] text-neutral-500 font-mono">
              APEX CASINO • 100% Provably Fair &amp; Secure
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
