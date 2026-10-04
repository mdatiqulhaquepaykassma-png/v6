import React, { useState, useEffect } from "react";
import { Shield, Sparkles, ArrowRight, User, KeyRound, Eye, EyeOff, Gift, Smartphone, CheckCircle } from "lucide-react";
import { UserWallet } from "../types";
import { sound } from "../utils/audio";
import { BUILD_NUMBER } from "../config/version";
import { getDeviceId } from "../utils/deviceId";
import { BrandLogo } from "./BrandLogo";

interface LoginScreenProps {
  onLoginSuccess: (user: UserWallet) => void;
  onOpenInstallApp?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onOpenInstallApp }) => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // New Device OTP Verification State
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpNotice, setOtpNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref");
    if (refParam) {
      setRefCode(refParam.toUpperCase());
      setMode("signup");
    }
  }, []);

  const handleInstantLogin = async () => {
    sound.playButtonClick();
    setError("");
    setLoading(true);

    try {
      const guestId = Math.random().toString(36).slice(2, 8);
      const studioUsername = `Guest_${guestId}`;
      const guestPassword = `GuestKey_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const deviceId = getDeviceId();
      let res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: studioUsername,
          password: guestPassword,
          deviceId,
          refCode: refCode.trim() || undefined,
        }),
      });
      let data = await res.json();

      if (!data.success) {
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: studioUsername,
            password: guestPassword,
            deviceId,
          }),
        });
        data = await res.json();
      }

      if (data.success && data.user) {
        if (data.sessionId) {
          localStorage.setItem("player_session_id", data.sessionId);
        }
        sound.playWinFanfare();
        sound.speak(`Welcome, ${data.user.username}!`);
        onLoginSuccess(data.user);
      } else {
        setError("Failed to initialize session.");
      }
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    setError("");

    if (!username.trim() || username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const deviceId = getDeviceId();

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          deviceId,
          refCode: mode === "signup" && refCode.trim() ? refCode.trim().toUpperCase() : undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        if (data.sessionId) {
          localStorage.setItem("player_session_id", data.sessionId);
        }
        sound.playWinFanfare();
        sound.speak(`Welcome, ${data.user.username}!`);
        onLoginSuccess(data.user);
      } else if (data.code === "DEVICE_VERIFICATION_REQUIRED") {
        setOtpRequired(true);
        setOtpNotice(data.error);
        if (data.otpCode) {
          setOtpCode(data.otpCode);
        }
      } else {
        sound.playLossSound();
        setError(data.error || "Authentication failed.");
      }
    } catch {
      setError("Network connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          code: otpCode.trim(),
          deviceId: getDeviceId(),
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.sessionId) {
          localStorage.setItem("player_session_id", data.sessionId);
        }
        sound.playWinFanfare();
        sound.speak(`Welcome, ${data.user.username}!`);
        onLoginSuccess(data.user);
      } else {
        sound.playLossSound();
        setError(data.error || "OTP verification failed. Please try again.");
      }
    } catch {
      setError("Network connection error during device verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#070a12] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(0,0,0,0))] flex flex-col justify-between p-2.5 sm:p-4 relative overflow-hidden text-neutral-100 select-none">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full mx-auto my-auto relative z-10 py-1 sm:py-2">
        {/* Brand Header */}
        <div className="text-center mb-2.5 sm:mb-4">
          <div className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-2xl shadow-amber-500/30 mb-2 items-center justify-center bg-black">
            <BrandLogo priority alt="APEX Dragon Tiger" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
            DRAGON TIGER ARENA
          </h1>
          <p className="text-[10px] sm:text-xs text-neutral-400 mt-1">
            Secure P2P Live Casino &amp; Escrow Platform
          </p>
        </div>

        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-3.5 sm:p-5 shadow-2xl">
          {otpRequired ? (
            /* New Device OTP Verification View */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">নতুন ডিভাইস যাচাইকরণ (Device Binding)</h3>
                <p className="text-[11px] text-neutral-400 leading-tight">
                  {otpNotice || "নতুন ডিভাইস থেকে লগইন করতে ৬ সংখ্যার কোড প্রদান করুন।"}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  ৬ সংখ্যার ওটিপি কোড (6-Digit OTP)
                </label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  maxLength={6}
                  className="w-full bg-neutral-950 border border-amber-500/50 rounded-xl px-3 py-2.5 text-center text-lg font-mono font-bold text-amber-300 tracking-widest focus:outline-none"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.trim().length < 4}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{loading ? "যাচাই হচ্ছে..." : "ডিভাইস অনুমোদন ও লগইন"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpRequired(false);
                  setError("");
                }}
                className="w-full text-center text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ← ফিরে যান (Back to Login)
              </button>
            </form>
          ) : (
            <>
              {/* Instant Play Button */}
              <button
                type="button"
                onClick={handleInstantLogin}
                disabled={loading}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
                <span>⚡ Instant Guest Play (1-Click)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex py-0.5 items-center mb-3">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="flex-shrink mx-2.5 text-[9px] uppercase font-bold text-neutral-500">
                  Or Use Credentials
                </span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setMode("signup");
                    setError("");
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    mode === "signup"
                      ? "bg-amber-500 text-neutral-950 font-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playButtonClick();
                    setMode("signin");
                    setError("");
                  }}
                  className={`py-1.5 rounded-lg transition-all ${
                    mode === "signin"
                      ? "bg-amber-500 text-neutral-950 font-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter username"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-white placeholder-neutral-600 text-xs focus:outline-none transition-colors"
                      maxLength={24}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <KeyRound className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter password"
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2 text-white placeholder-neutral-600 text-xs focus:outline-none transition-colors"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      Referral Code (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={refCode}
                        onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                        placeholder="e.g. VIP2026"
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-white placeholder-neutral-600 text-xs focus:outline-none transition-colors uppercase font-mono"
                        maxLength={12}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-bold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <span>{loading ? "Authenticating..." : mode === "signup" ? "Create Free Account" : "Sign In to Arena"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>

        {/* PWA & Version Footer */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500 px-1">
          {onOpenInstallApp && (
            <button
              type="button"
              onClick={onOpenInstallApp}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
            >
              📲 Install App (PWA)
            </button>
          )}
          <span className="font-mono ml-auto">Build #{BUILD_NUMBER}</span>
        </div>
      </div>
    </div>
  );
};
