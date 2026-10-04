import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DigitColumnProps {
  digit: string;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const DigitColumn = React.memo<DigitColumnProps>(({ digit, className = "" }) => {
  const num = parseInt(digit, 10);
  const isDigit = !isNaN(num) && num >= 0 && num <= 9;

  if (!isDigit) {
    return (
      <span className={`inline-block select-none opacity-80 ${className}`}>
        {digit}
      </span>
    );
  }

  return (
    <span
      className="inline-block relative overflow-hidden h-[1.25em] leading-[1.25em] align-middle font-mono select-none"
      style={{ width: "0.62em" }}
    >
      <motion.span
        className="absolute inset-x-0 flex flex-col items-center"
        initial={false}
        animate={{ y: `-${num * 10}%` }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 26,
          mass: 0.65,
        }}
        style={{ willChange: "transform" }}
      >
        {DIGITS.map((n) => (
          <span
            key={n}
            className={`h-[1.25em] flex items-center justify-center font-black ${className}`}
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
});

DigitColumn.displayName = "DigitColumn";

export interface AnimatedRollingBalanceProps {
  value: number;
  currencySymbol?: string;
  symbolPosition?: "prefix" | "suffix";
  decimals?: number;
  className?: string;
  glowOnUpdate?: boolean;
}

export const AnimatedRollingBalance: React.FC<AnimatedRollingBalanceProps> = React.memo(({
  value,
  currencySymbol = "৳",
  symbolPosition = "prefix",
  decimals = 0,
  className = "",
  glowOnUpdate = true,
}) => {
  const prevValueRef = useRef<number>(value);
  const [pulseColor, setPulseColor] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (glowOnUpdate && prevValueRef.current !== value) {
      if (value > prevValueRef.current) {
        setPulseColor("up");
      } else if (value < prevValueRef.current) {
        setPulseColor("down");
      }
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setPulseColor(null);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [value, glowOnUpdate]);

  const formattedNumber = useMemo(() => {
    const safeVal = isNaN(value) ? 0 : Math.max(0, value);
    return safeVal.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [value, decimals]);

  const characters = useMemo(() => formattedNumber.split(""), [formattedNumber]);

  return (
    <motion.span
      animate={
        pulseColor === "up"
          ? { scale: [1, 1.04, 1] }
          : pulseColor === "down"
          ? { scale: [1, 0.98, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`inline-flex items-center tracking-tight font-black transition-colors duration-300 ${className} ${
        pulseColor === "up"
          ? "text-emerald-300 [text-shadow:0_0_10px_rgba(52,211,153,0.5)]"
          : pulseColor === "down"
          ? "text-amber-200"
          : ""
      }`}
    >
      {symbolPosition === "prefix" && currencySymbol && (
        <span className="mr-0.5 opacity-90 select-none">{currencySymbol}</span>
      )}

      <span className="inline-flex items-center">
        {characters.map((char, index) => (
          <DigitColumn
            key={`${index}-${characters.length}`}
            digit={char}
          />
        ))}
      </span>

      {symbolPosition === "suffix" && currencySymbol && (
        <span className="ml-0.5 opacity-90 select-none">{currencySymbol}</span>
      )}
    </motion.span>
  );
});

AnimatedRollingBalance.displayName = "AnimatedRollingBalance";
export default AnimatedRollingBalance;
