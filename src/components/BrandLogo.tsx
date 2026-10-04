import React, { useState } from "react";

interface BrandLogoProps {
  className?: string;
  sizeClassName?: string;
  alt?: string;
  priority?: boolean;
}

const LOGO_SOURCES = [
  "/app-logo.png",
  "/app-logo.webp",
  "/app-logo.jpg",
  "/icon.svg",
];

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  sizeClassName = "w-full h-full",
  alt = "SANCTUM Dragon Tiger Arena",
  priority = false,
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  const handleError = () => {
    if (sourceIndex < LOGO_SOURCES.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  if (allFailed) {
    return (
      <div
        className={`${sizeClassName} bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center relative select-none ${className}`}
      >
        <span className="text-base sm:text-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          🐉
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${sizeClassName} ${className}`}>
      {/* Smooth Shimmer Background while Loading */}
      {!hasLoaded && (
        <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
          <span className="text-xs opacity-50">🐉</span>
        </div>
      )}

      <img
        src={LOGO_SOURCES[sourceIndex]}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setHasLoaded(true)}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          hasLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};
