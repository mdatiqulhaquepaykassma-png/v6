import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, AlertTriangle, Send, CheckCircle2, ChevronRight, User } from "lucide-react";
import { sound } from "../utils/audio";

interface ReportPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterUserId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
}

const REPORT_REASONS = [
  {
    id: "Cheating",
    label: "Cheating & Modded Client",
    description: "Suspicious card knowledge, timing anomalies, or third-party exploits.",
    badge: "High Priority",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
  },
  {
    id: "Botting",
    label: "Automated Bot / Collusion",
    description: "Inhuman repetitive actions or coordinated play with other accounts.",
    badge: "Security",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  },
  {
    id: "Harassment",
    label: "Harassment & Abusive Chat",
    description: "Offensive language, death threats, hate speech, or targeted bullying.",
    badge: "Conduct",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    id: "Spam",
    label: "Spam & Room Flooding",
    description: "Rapidly creating and abandoning rooms or spamming room invitations.",
    badge: "Spam",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    id: "Other",
    label: "Other Policy Violation",
    description: "Suspicious activity not listed above.",
    badge: "General",
    color: "text-neutral-300 border-neutral-700 bg-neutral-800",
  },
];

export const ReportPlayerModal: React.FC<ReportPlayerModalProps> = ({
  isOpen,
  onClose,
  reporterUserId,
  reporterUsername,
  reportedUserId,
  reportedUsername,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedReason, setSelectedReason] = useState<string>("Cheating");
  const [details, setDetails] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const handleSubmitReport = async () => {
    setLoading(true);
    setErrorMsg("");
    sound.playButtonClick();

    try {
      const res = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterUserId,
          reporterUsername,
          reportedUserId,
          reportedUsername,
          reason: selectedReason,
          details,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playWinFanfare();
        setStep(3);
      } else {
        setErrorMsg(data.error || "Failed to submit report. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error submitting report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) {
            onClose();
          }
        }}
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.2 }}
        className="relative bg-[#0F131D] border-t sm:border border-amber-500/40 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Mobile Swipe-to-Close Drag Indicator */}
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-neutral-600/80" />
        </div>

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-600 hover:border-amber-400 transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pr-14 border-b border-white/10 bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Report Player: @{reportedUsername}</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Step {step} of 3 · 100% Confidential Anti-Cheat Audit
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-neutral-300 font-bold">
                Select the primary reason for reporting <strong className="text-white">@{reportedUsername}</strong>:
              </div>
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => {
                  const isSelected = selectedReason === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReason(r.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-950/40"
                          : "bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white">{r.label}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${r.color}`}>
                            {r.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-tight">
                          {r.description}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-amber-400" : "text-neutral-600"}`} />
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Continue to Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Selected Reason</span>
                  <div className="text-sm font-bold text-amber-300">{selectedReason}</div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Provide evidence or details (optional but recommended):
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe suspicious behavior, round number, bet pattern, or offensive words..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 text-white placeholder-neutral-500 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={loading}
                  className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? "Submitting..." : "Submit Confidential Report"}</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-white">Report Registered</h4>
              <p className="text-neutral-300 text-xs max-w-xs mx-auto leading-relaxed">
                Thank you for keeping Apex Casino fair. Our automated anti-cheat engine and security moderators will review <strong className="text-white">@{reportedUsername}</strong> for <strong className="text-amber-300">{selectedReason}</strong>.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
