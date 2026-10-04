import React, { useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

interface MobileModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxW?: string;
  showDragHandle?: boolean;
}

export const MobileModalWrapper: React.FC<MobileModalWrapperProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  maxW = "max-w-2xl",
  showDragHandle = true,
}) => {
  const dragControls = useDragControls();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm -z-10"
          />

          {/* Modal / Bottom Sheet with Controlled Drag Handle */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                onClose();
              }
            }}
            className={`w-full ${maxW} bg-neutral-900 border border-amber-500/30 rounded-t-3xl sm:rounded-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative transform-gpu will-change-transform ${className}`}
          >
            {/* Mobile Swipe Drag Indicator Handle */}
            {showDragHandle && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing sm:hidden bg-neutral-950/90 border-b border-white/5 touch-none"
              >
                <div className="w-12 h-1.5 rounded-full bg-neutral-500 hover:bg-neutral-400 transition-colors" />
              </div>
            )}

            {/* Content with smooth native scrolling */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
