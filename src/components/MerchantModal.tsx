import React, { useState } from "react";
import { X, Code2, Play, Key, CheckCircle, Clock } from "lucide-react";

interface MerchantModalProps {
  onClose: () => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({ onClose }) => {
  const [activeEndpoint, setActiveEndpoint] = useState<string>("/player/launch-game");
  const [loading, setLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    method: string;
    status: number;
    timeMs: number;
    response: Record<string, unknown>;
  } | null>(null);

  const handleTestAPI = async (endpoint: string) => {
    setActiveEndpoint(endpoint);
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          method: "POST",
          payload: {
            externalPlayerId: "ext_user_8829",
            currency: "INR",
            amount: 5000,
            table: "classic",
          },
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-neutral-900 border border-amber-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
        {/* Fixed Top-Right High Contrast Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-600 hover:border-amber-400 shadow-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Close modal"
          title="Close"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 pr-16 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Merchant & Aggregator API Playground
              </h2>
              <p className="text-xs text-neutral-400">
                Seamless Wallet integration, HMAC-SHA256 authenticated REST gateway
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Credentials Card */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Sandbox Credentials
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-neutral-500 block mb-1">Merchant API Key (Header: x-api-key)</label>
                <div className="bg-neutral-900 px-3 py-1.5 rounded font-mono text-[11px] text-amber-200 border border-neutral-800">
                  mk_test_abc1234567890abcdef1234567890abcdef
                </div>
              </div>
              <div>
                <label className="text-neutral-500 block mb-1">API Secret (Used for HMAC-SHA256 signature)</label>
                <div className="bg-neutral-900 px-3 py-1.5 rounded font-mono text-[11px] text-neutral-300 border border-neutral-800">
                  ms_test_xyz7890123456789abcdef0123456789...
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Endpoints */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Test Merchant Endpoints
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleTestAPI("/player/create")}
                disabled={loading}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
                  activeEndpoint === "/player/create"
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <span>POST /player/create</span>
                <Play className="w-3 h-3" />
              </button>

              <button
                onClick={() => handleTestAPI("/player/deposit")}
                disabled={loading}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
                  activeEndpoint === "/player/deposit"
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <span>POST /player/deposit</span>
                <Play className="w-3 h-3" />
              </button>

              <button
                onClick={() => handleTestAPI("/player/launch-game")}
                disabled={loading}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
                  activeEndpoint === "/player/launch-game"
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <span>POST /player/launch-game</span>
                <Play className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Response Inspector */}
          {testResult && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    HTTP {testResult.status} OK
                  </span>
                  <span className="text-xs font-mono text-neutral-400">{testResult.endpoint}</span>
                </div>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {testResult.timeMs}ms
                </span>
              </div>

              <pre className="bg-neutral-900 p-3 rounded-lg text-[11px] font-mono text-amber-200 overflow-x-auto border border-neutral-800">
                {JSON.stringify(testResult.response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
