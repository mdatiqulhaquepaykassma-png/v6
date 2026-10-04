import React from "react";
import { X, TrendingUp, BarChart2 } from "lucide-react";
import { RoadmapItem } from "../types";

interface RoadmapModalProps {
  tableName: string;
  roadmap: RoadmapItem[];
  onClose: () => void;
}

export const RoadmapModal: React.FC<RoadmapModalProps> = ({ tableName, roadmap, onClose }) => {
  const total = roadmap.length || 1;
  const dragonCount = roadmap.filter((r) => r.result === "DRAGON").length;
  const tigerCount = roadmap.filter((r) => r.result === "TIGER").length;
  const tieCount = roadmap.filter((r) => r.result === "TIE").length;

  const dragonPct = Math.round((dragonCount / total) * 100);
  const tigerPct = Math.round((tigerCount / total) * 100);
  const tiePct = Math.round((tieCount / total) * 100);

  // Format Bead Road (6 rows high grid)
  const columnsCount = Math.max(16, Math.ceil(roadmap.length / 6));
  const beadGrid: (RoadmapItem | null)[][] = Array.from({ length: 6 }, () =>
    Array(columnsCount).fill(null)
  );

  roadmap.forEach((item, idx) => {
    const col = Math.floor(idx / 6);
    const row = idx % 6;
    if (col < columnsCount) {
      beadGrid[row][col] = item;
    }
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-neutral-900 border border-amber-500/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Baccarat-Style Trend Roadmap & Shoe Statistics
              </h2>
              <p className="text-xs text-neutral-400">
                Live statistics & pattern visualizer for {tableName}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Win Rate Stats Bar */}
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-400">DRAGON: {dragonPct}% ({dragonCount})</span>
              <span className="font-bold text-emerald-400">TIE: {tiePct}% ({tieCount})</span>
              <span className="font-bold text-red-400">TIGER: {tigerPct}% ({tigerCount})</span>
            </div>

            <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden flex">
              <div style={{ width: `${dragonPct}%` }} className="bg-blue-600 h-full transition-all" />
              <div style={{ width: `${tiePct}%` }} className="bg-emerald-500 h-full transition-all" />
              <div style={{ width: `${tigerPct}%` }} className="bg-red-600 h-full transition-all" />
            </div>
          </div>

          {/* Bead Road Matrix */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-400" />
              Bead Road (Sequential Results Grid)
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 overflow-x-auto">
              <div className="grid grid-rows-6 gap-1 min-w-[500px]">
                {beadGrid.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1">
                    {row.map((cell, colIdx) => (
                      <div
                        key={colIdx}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                          !cell
                            ? "border-neutral-900 bg-neutral-900/30 text-transparent"
                            : cell.result === "DRAGON"
                            ? "bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/50"
                            : cell.result === "TIGER"
                            ? "bg-red-600 text-white border-red-400 shadow-sm shadow-red-500/50"
                            : "bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50"
                        }`}
                        title={
                          cell
                            ? `Round #${cell.roundNumber}: ${cell.result} (D: ${cell.dragonCard.display}, T: ${cell.tigerCard.display})`
                            : undefined
                        }
                      >
                        {cell ? (cell.result === "DRAGON" ? "D" : cell.result === "TIGER" ? "T" : "X") : ""}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Recent History Log */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Recent 20 Settled Rounds
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {roadmap.slice(0, 20).map((r) => (
                <div
                  key={r.roundNumber}
                  className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="text-neutral-400 text-[10px]">#{r.roundNumber}</span>
                    <div className="font-semibold text-white mt-0.5">
                      {r.dragonCard.display} vs {r.tigerCard.display}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.result === "DRAGON"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : r.result === "TIGER"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {r.result}
                  </span>
                </div>
              ))}
            </div>
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
