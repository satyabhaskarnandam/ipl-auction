import { motion } from "framer-motion";

const STAR_COUNT = 5;

const getFilledStars = (score) => {
  const normalized = Number.isFinite(Number(score)) ? Number(score) : 0;
  return Math.max(0, Math.min(STAR_COUNT, Math.round(normalized)));
};

function StarRow({ label, score, delay = 0 }) {
  const filled = getFilledStars(score);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-semibold text-slate-100">{Number(score || 0).toFixed(1)}/5</span>
      </div>
      <div className="flex items-center gap-1" aria-label={`${label} rating ${Number(score || 0).toFixed(1)} out of 5`}>
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const active = index < filled;
          return (
            <motion.span
              key={`${label}-${index}`}
              initial={{ opacity: 0, scale: 0.75, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut", delay: delay + index * 0.04 }}
              className={active ? "text-amber-300" : "text-slate-600"}
            >
              ★
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

function TeamRatingPanel({ title, rating, loading = false }) {
  const batting = Number(rating?.batting || 0);
  const bowling = Number(rating?.bowling || 0);
  const overall = Number(rating?.overall || 0);
  const strengthsWeaknesses = rating?.strengthsWeaknesses || "Balanced squad with room for tactical upgrades.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-xl border border-line bg-slate-900/70 p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-cyan-100">{title}</h3>
        {loading ? <span className="text-xs text-slate-400">Updating...</span> : null}
      </div>

      <div className="space-y-3">
        <StarRow label="Batting" score={batting} delay={0.04} />
        <StarRow label="Bowling" score={bowling} delay={0.12} />

        <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/35 px-3 py-2">
          <p className="text-xs text-cyan-200">Overall Score</p>
          <p className="text-lg font-bold text-cyan-100">{overall.toFixed(1)}/10</p>
        </div>

        <p className="text-xs leading-relaxed text-slate-300">{strengthsWeaknesses}</p>
      </div>
    </motion.div>
  );
}

export default TeamRatingPanel;
