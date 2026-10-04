import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, StickyNote, Tag, Save, Trash2, CheckCircle2, User, Swords } from "lucide-react";
import { sound } from "../utils/audio";
import { PlayerNote } from "../types";

interface PlayerNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUsername: string;
  onOpenReport?: () => void;
}

const COMMON_TAGS = [
  "Aggressive Bluffer",
  "Always Dragon",
  "Always Tiger",
  "Tight / Folds Early",
  "High Roller",
  "Tilt-Prone",
  "Tactical Squeezer",
  "Friendly Rival",
];

export const PlayerNotesModal: React.FC<PlayerNotesModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUsername,
  onOpenReport,
}) => {
  const [noteText, setNoteText] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const storageKey = `dt_player_note_${targetUserId}`;

  useEffect(() => {
    if (isOpen && targetUserId) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed: PlayerNote = JSON.parse(raw);
          setNoteText(parsed.note || "");
          setSelectedTags(parsed.tags || []);
        } else {
          setNoteText("");
          setSelectedTags([]);
        }
      } catch {
        setNoteText("");
        setSelectedTags([]);
      }
      setSavedSuccess(false);
    }
  }, [isOpen, targetUserId, storageKey]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    sound.playButtonClick();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveNote = () => {
    sound.playButtonClick();
    const noteData: PlayerNote = {
      targetUserId,
      targetUsername,
      note: noteText.trim(),
      tags: selectedTags,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(noteData));
      sound.playCoinsClinking();
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = () => {
    sound.playButtonClick();
    try {
      localStorage.removeItem(storageKey);
      setNoteText("");
      setSelectedTags([]);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (e) {
      console.error(e);
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

        {/* Header */}
        <div className="p-4 sm:p-5 pr-14 border-b border-white/10 bg-gradient-to-r from-[#171f30] via-neutral-900 to-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>Private Note: @{targetUsername}</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Only visible to you · Remember opponent's style &amp; bluffs
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 font-bold animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4" />
              <span>Note updated successfully!</span>
            </div>
          )}

          {/* Quick Style Tags */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Opponent Behavioral Tags:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-neutral-950 shadow-sm"
                        : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Note Area */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-neutral-300">
              Custom Scouting Observations:
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Always calls on Tiger when down ৳2,000. Folds to 3x raises. Never bluffs on King..."
              rows={4}
              className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-700 focus:border-amber-400 text-white placeholder-neutral-500 text-xs focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteNote}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 transition-colors cursor-pointer"
                title="Clear Note"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {onOpenReport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReport();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold cursor-pointer"
                >
                  Report Player ⚠️
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveNote}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
