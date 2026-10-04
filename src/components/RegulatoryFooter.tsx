import React from "react";
import { ShieldCheck, Lock, Activity, Globe, Scale, Award, HeartHandshake } from "lucide-react";
import { HighLoadTelemetry } from "../types";

interface RegulatoryFooterProps {
  lang: "bn" | "en";
  telemetry?: HighLoadTelemetry | null;
  onOpenProvablyFair?: () => void;
  onOpenLiquidity?: () => void;
  onOpenTransparency?: () => void;
  onOpenRules?: () => void;
  onOpenReferral?: () => void;
}

export const RegulatoryFooter: React.FC<RegulatoryFooterProps> = ({
  lang,
  telemetry,
  onOpenProvablyFair,
  onOpenLiquidity,
  onOpenTransparency,
  onOpenRules,
  onOpenReferral,
}) => {
  const activeCount = telemetry?.totalActivePlayers ?? 0;
  const tps = telemetry?.tps ?? 0;
  const latency = telemetry?.latencyMs || 14;

  return (
    <footer className="mt-8 border-t border-white/5 bg-[#060a12]/95 backdrop-blur-md text-neutral-400 text-xs">
      {/* Main Official Badges & Regulatory Credentials */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-3 py-3 border-y border-white/5">
          {/* License 1: Curacao */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-3 text-center space-y-1">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">CURAÇAO</span>
            <span className="text-[8px] sm:text-[9px] text-neutral-600 font-mono">#8048/JAZ</span>
          </div>

          {/* License 2: iTech Labs */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-3 text-center space-y-1">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">iTech Labs</span>
            <span className="text-[8px] sm:text-[9px] text-neutral-600 font-mono">Certified</span>
          </div>

          {/* License 3: BMM Testlabs */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-3 text-center space-y-1">
            <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">BMM</span>
            <span className="text-[8px] sm:text-[9px] text-neutral-600 font-mono">GLI-19</span>
          </div>

          {/* Security: Cloudflare SSL */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-3 text-center space-y-1">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">SSL 256</span>
            <span className="text-[8px] sm:text-[9px] text-neutral-600 font-mono">Cloudflare</span>
          </div>

          {/* Responsible Gaming */}
          <div className="flex flex-col items-center justify-center p-2 sm:p-3 text-center space-y-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-red-500/80 text-red-400 font-black text-[9px] sm:text-[10px] flex items-center justify-center">
              18+
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">18+ Only</span>
          </div>

          {/* Provably Fair Verifier */}
          <button
            onClick={onOpenProvablyFair}
            className="flex flex-col items-center justify-center p-2 sm:p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer group space-y-1"
          >
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 tracking-wide">Fair</span>
            <span className="text-[8px] sm:text-[9px] text-amber-600 font-mono">SHA-256</span>
          </button>

          {/* 100% Transparency Charter Card */}
          {onOpenTransparency && (
            <button
              onClick={onOpenTransparency}
              className="flex flex-col items-center justify-center p-2 sm:p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer group space-y-1"
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-300 tracking-wide">Transparency</span>
              <span className="text-[8px] sm:text-[9px] text-emerald-600 font-mono">100% P2P</span>
            </button>
          )}

          {/* Game Rules Card */}
          {onOpenRules && (
            <button
              onClick={onOpenRules}
              className="flex flex-col items-center justify-center p-2 sm:p-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer group space-y-1"
            >
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] sm:text-[10px] font-bold text-white tracking-wide">Rules</span>
              <span className="text-[8px] sm:text-[9px] text-neutral-600 font-mono">Official</span>
            </button>
          )}
        </div>

        {/* Corporate & Legal Text */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 text-[10px] text-neutral-500 leading-relaxed">
          <div className="max-w-2xl space-y-2">
            <p>
              {lang === "bn"
                ? "APEX DRAGON TIGER একটি কুরাসাও লাইসেন্সপ্রাপ্ত (No. 8048/JAZ) আন্তর্জাতিক পিয়ার-টু-পিয়ার এক্সচেঞ্জ প্ল্যাটফর্ম। আমাদের ম্যাচিং ইঞ্জিন শতভাগ স্বচ্ছ — যেখানে কোন হাউস এজ নেই।"
                : "APEX DRAGON TIGER is a licensed (Curaçao No. 8048/JAZ) Peer-to-Peer Exchange platform. All rounds utilize SHA-256 Provably Fair verification and are audited by iTech Labs."}
            </p>
            <p>
              {lang === "bn"
                ? "১৮+ সতর্কবার্তা: জুয়া আসক্তি সৃষ্টি করতে পারে। দায়িত্বশীলভাবে খেলুন।"
                : "18+ Notice: Gambling involves financial risk. Please play responsibly at BeGambleAware.org."}
            </p>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            {onOpenReferral && (
              <button onClick={onOpenReferral} className="hover:text-amber-400 transition-colors">
                {lang === "bn" ? "রেফার ও ইনকাম" : "Refer & Earn"}
              </button>
            )}
            {onOpenLiquidity && (
              <button onClick={onOpenLiquidity} className="hover:text-amber-400 transition-colors">
                {lang === "bn" ? "লিকুইডিটি" : "Liquidity"}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-4 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-neutral-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} APEX Gaming International Ltd.</span>
            <span>·</span>
            <span>All rights reserved.</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span>SLA: 99.9%</span>
            <span>·</span>
            <span className="text-emerald-400/90 font-medium">Fully Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
