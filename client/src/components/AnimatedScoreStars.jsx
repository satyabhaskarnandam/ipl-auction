import { memo, useMemo } from "react";
import { motion } from "framer-motion";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function AnimatedScoreStars({ score }) {
  const normalizedScore = Number.isFinite(Number(score)) ? Number(score) : 0;

  const fills = useMemo(() => {
    const safeScore = clamp(normalizedScore, 0, 5);
    return Array.from({ length: 5 }, (_, index) => {
      const raw = safeScore - index;
      return clamp(raw, 0, 1);
    });
  }, [normalizedScore]);

  return (
    <motion.div
      key={`stars-${normalizedScore.toFixed(1)}`}
      initial={{ opacity: 0.65, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex items-center gap-0.5"
      aria-label={`Score ${normalizedScore.toFixed(1)} out of 5`}
    >
      {fills.map((fill, index) => (
        <span key={`star-${index}`} className="relative inline-block text-[12px] leading-none">
          <span className="text-slate-600">★</span>
          <span
            className="absolute left-0 top-0 overflow-hidden text-amber-300"
            style={{ width: `${Math.round(fill * 100)}%` }}
          >
            ★
          </span>
        </span>
      ))}
    </motion.div>
  );
}

export default memo(AnimatedScoreStars);
