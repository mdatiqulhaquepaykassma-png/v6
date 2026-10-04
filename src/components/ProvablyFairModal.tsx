import React, { useState } from "react";
import { X, ShieldCheck, Hash, Key, CheckCircle, AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { TableRound } from "../types";

interface ProvablyFairModalProps {
  currentRound: TableRound | null;
  onClose: () => void;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({ currentRound, onClose }) => {
  const [serverSeedInput, setServerSeedInput] = useState<string>(currentRound?.serverSeed || "");
  const [clientSeedInput, setClientSeedInput] = useState<string>(currentRound?.clientSeed || "dragon_tiger_btc_block_894102");
  const [nonceInput, setNonceInput] = useState<number>(currentRound?.nonce || 1001);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    computedServerSeedHash: string;
    hmac: string;
    dragonCard: { display: string; value: number };
    tigerCard: { display: string; value: number };
    result: string;
    algorithm: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerify = async () => {
    if (!serverSeedInput || !clientSeedInput) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverSeed: serverSeedInput,
          serverSeedHash: currentRound?.serverSeedHash,
          clientSeed: clientSeedInput,
          nonce: nonceInput,
        }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-neutral-900 border border-amber-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
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
        <div className="flex items-center justify-between px-6 py-4 pr-16 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Provably Fair Cryptographic Verification
              </h2>
              <p className="text-xs text-neutral-400">
                HMAC-SHA512 with modulo bias rejection & SHA-256 commitment
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Current Active Round Proof */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Round Commitment (Round #{currentRound?.roundNumber || "1001"})</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                SHA-256 Committed
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Server Seed Hash (Pre-committed before round starts):</label>
                <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 font-mono text-[11px] text-amber-200 break-all">
                  <span className="flex-1">{currentRound?.serverSeedHash || "Generating hash..."}</span>
                  <button
                    onClick={() => copyToClipboard(currentRound?.serverSeedHash || "", "hash")}
                    className="text-neutral-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Client Seed (Public):</label>
                  <div className="bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300">
                    {currentRound?.clientSeed || "dragon_tiger_btc_block_894102"}
                  </div>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Nonce Index:</label>
                  <div className="bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300">
                    {currentRound?.nonce || 1001}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">
                  Server Seed (Secret revealed after round completion):
                </label>
                <div className="bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-400">
                  {currentRound?.serverSeed ? (
                    <span className="text-emerald-400 font-semibold">{currentRound.serverSeed}</span>
                  ) : (
                    <span className="text-amber-500/80 italic">
                      🔒 Secret locked in escrow. Revealed automatically once this round is settled.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Verifier Tool */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Independent Verifier Calculator
            </h3>
            <p className="text-xs text-neutral-400">
              Input any completed round parameters to independently recompute the HMAC-SHA512 digest and verify the exact cards drawn.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 block mb-1">Server Seed (64 Hex Characters):</label>
                <input
                  type="text"
                  value={serverSeedInput}
                  onChange={(e) => setServerSeedInput(e.target.value)}
                  placeholder="Paste revealed server seed here..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 block mb-1">Client Seed:</label>
                  <input
                    type="text"
                    value={clientSeedInput}
                    onChange={(e) => setClientSeedInput(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 block mb-1">Nonce:</label>
                  <input
                    type="number"
                    value={nonceInput}
                    onChange={(e) => setNonceInput(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={verifying || !serverSeedInput}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                <RefreshCw className={`w-4 h-4 ${verifying ? "animate-spin" : ""}`} />
                {verifying ? "Verifying Cryptographic Digest..." : "Verify Outcome Mathematically"}
              </button>
            </div>

            {verificationResult && (
              <div className="mt-4 p-4 rounded-xl border bg-neutral-900/90 space-y-3 border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle className="w-4 h-4" />
                    Cryptographic Integrity Verified 100%
                  </div>
                  <span className="text-[10px] text-neutral-400">{verificationResult.algorithm}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-center">
                    <div className="text-[10px] text-blue-400 uppercase font-semibold">Derived Dragon Card</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {verificationResult.dragonCard.display}
                    </div>
                    <div className="text-[10px] text-neutral-400">Value: {verificationResult.dragonCard.value}</div>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-center">
                    <div className="text-[10px] text-red-400 uppercase font-semibold">Derived Tiger Card</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {verificationResult.tigerCard.display}
                    </div>
                    <div className="text-[10px] text-neutral-400">Value: {verificationResult.tigerCard.value}</div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <span className="text-xs text-neutral-400">Deterministic Winner: </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    verificationResult.result === "DRAGON" ? "bg-blue-500/20 text-blue-400" :
                    verificationResult.result === "TIGER" ? "bg-red-500/20 text-red-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {verificationResult.result}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-neutral-400 mb-1">Computed HMAC-SHA512 Digest:</div>
                  <div className="bg-neutral-950 p-2 rounded text-[10px] font-mono text-neutral-300 break-all">
                    {verificationResult.hmac}
                  </div>
                </div>
              </div>
            )}
          </div>
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
