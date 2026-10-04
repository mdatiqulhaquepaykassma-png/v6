import { useEffect } from "react";

interface GlobalShortcutsProps {
  onOpenWallet: () => void;
  onOpenLeaderboard: () => void;
  onOpenGame: () => void;
  onOpenP2P: () => void;
  onOpenMenu: () => void;
  onCloseModals: () => void;
}

export const GlobalShortcuts: React.FC<GlobalShortcutsProps> = ({
  onOpenWallet,
  onOpenLeaderboard,
  onOpenGame,
  onOpenP2P,
  onOpenMenu,
  onCloseModals,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in form inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (e.key === "Escape") {
        onCloseModals();
        return;
      }

      // Check single keys
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (key) {
          case "W":
            e.preventDefault();
            onOpenWallet();
            break;
          case "L":
            e.preventDefault();
            onOpenLeaderboard();
            break;
          case "G":
            e.preventDefault();
            onOpenGame();
            break;
          case "P":
            e.preventDefault();
            onOpenP2P();
            break;
          case "M":
            e.preventDefault();
            onOpenMenu();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onOpenWallet,
    onOpenLeaderboard,
    onOpenGame,
    onOpenP2P,
    onOpenMenu,
    onCloseModals,
  ]);

  return null;
};
