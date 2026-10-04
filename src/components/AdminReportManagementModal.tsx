import React, { useState, useEffect } from "react";
import { X, ShieldAlert, CheckCircle2, RefreshCw, ThumbsDown, ShieldOff } from "lucide-react";
import { PlayerReport } from "../types";

interface AdminReportManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const AdminReportManagementModal: React.FC<AdminReportManagementModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("admin_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error("Failed to fetch reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (reportId: string, action: "BAN" | "DISMISS" | "INVESTIGATE" | "RESOLVED", reportedUsername: string) => {
    const notes = window.prompt(`Admin notes for marking report as ${action}:`, `Marked as ${action} by admin`);
    if (notes === null) return;

    setActionLoadingId(reportId);
    setActionMsg(null);
    try {
      const serverAction = action === "BAN" ? "BAN" : action === "DISMISS" ? "DISMISS" : "INVESTIGATE";
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ action: serverAction, notes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`Successfully updated report for @${reportedUsername} to ${action}`);
        fetchReports();
        if (onUpdate) onUpdate();
      } else {
        alert(data.error || "Failed to update report");
      }
    } catch {
      alert("Network error updating report");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-[#0b0f19] border border-neutral-800 text-neutral-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-600 hover:border-amber-400 transition-all cursor-pointer"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between shrink-0 pr-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Admin Report Management Center</h2>
              <p className="text-xs text-neutral-400">Review pending user reports and take moderation actions</p>
            </div>
          </div>
          <button
            onClick={fetchReports}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {actionMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)}>✕</button>
          </div>
        )}

        {/* Reports Content List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {loading && reports.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">Loading user reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 bg-neutral-900/40 rounded-xl border border-dashed border-neutral-800">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-neutral-300">No pending reports found</p>
              <p className="text-xs text-neutral-500 mt-1">All player reports have been successfully reviewed and resolved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        {r.reason}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === "PENDING" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {r.status}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {new Date(r.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs">
                      <strong className="text-rose-400">Reported: @{r.reportedUsername}</strong>{" "}
                      <span className="text-neutral-500 font-mono">({r.reportedUserId})</span>
                      <span className="text-neutral-400 mx-2">·</span>
                      <span className="text-neutral-300">Reporter: @{r.reporterUsername}</span>
                    </div>

                    <p className="text-xs text-neutral-300 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 mt-1">
                      {r.details || "No additional details provided."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      disabled={actionLoadingId === r.id}
                      onClick={() => handleAction(r.id, "RESOLVED", r.reportedUsername)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </button>
                    <button
                      disabled={actionLoadingId === r.id}
                      onClick={() => handleAction(r.id, "DISMISS", r.reportedUsername)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Dismissed</span>
                    </button>
                    <button
                      disabled={actionLoadingId === r.id}
                      onClick={() => handleAction(r.id, "BAN", r.reportedUsername)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      <span>Banned</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <span>Anti-Cheat Moderation Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
