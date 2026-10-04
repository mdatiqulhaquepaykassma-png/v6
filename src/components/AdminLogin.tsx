import React, { useState } from "react";
import { ShieldAlert, Lock, ArrowLeft, KeyRound } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToGame?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToGame }) => {
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem("admin_token", data.token);
        sessionStorage.setItem("admin_authorized", "true");
        if (data.user) {
          sessionStorage.setItem("admin_user", JSON.stringify(data.user));
        }
        onLoginSuccess();
      } else {
        setAuthError(data.error || "Invalid administrator credentials.");
      }
    } catch {
      // Network/server failure must be treated strictly as an error, never an authentication bypass
      setAuthError("Unable to reach the server. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToGame = () => {
    if (onBackToGame) {
      onBackToGame();
    } else {
      window.location.hash = "#/";
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(0,0,0,0))] flex items-center justify-center p-4">
      <div className="bg-[#0e131f] border-2 border-amber-500/40 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl shadow-black space-y-6 relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500"></div>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            ENTERPRISE ADMIN PORTAL
          </h2>
          <p className="text-xs text-neutral-400">
            Enter authorized administrator credentials to access console
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              required
              value={adminUsername}
              onChange={(e) => {
                setAdminUsername(e.target.value);
                setAuthError(null);
              }}
              placeholder="Administrator username"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-bold transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAuthError(null);
                }}
                placeholder="Administrator password"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/70 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-bold transition-all pr-10"
              />
              <KeyRound className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold text-center">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? "Authenticating..." : "Login to Console"}</span>
          </button>
        </form>

        {/* Back to Game */}
        <div className="pt-2 border-t border-neutral-800 text-center space-y-3">
          <button
            type="button"
            onClick={handleBackToGame}
            className="text-xs text-neutral-400 hover:text-amber-400 font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Player Arena</span>
          </button>
          <div className="text-[10px] font-mono text-neutral-500 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Cryptographic Session Guard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
