import { useState } from "react";
import { IPL_TEAMS } from "../data/teams";

function TeamLogoGrid({ selectedTeam, takenTeams, onSelect }) {
  const [failed, setFailed] = useState(() => ({}));
  const [urlIndexByTeam, setUrlIndexByTeam] = useState(() => ({}));

  const handleImageError = (teamId, totalUrls) => {
    setUrlIndexByTeam((prev) => {
      const idx = prev[teamId] ?? 0;
      if (idx + 1 < totalUrls) {
        return { ...prev, [teamId]: idx + 1 };
      }
      queueMicrotask(() => {
        setFailed((f) => ({ ...f, [teamId]: true }));
      });
      return prev;
    });
  };

  return (
    <div className="grid grid-cols-5 gap-3 sm:gap-4">
      {IPL_TEAMS.map((team) => {
        const taken = takenTeams.includes(team.id) && selectedTeam !== team.id;
        const selected = selectedTeam === team.id;
        const showFallback = failed[team.id];
        const urls = team.logoUrls || [];
        const urlIdx = urlIndexByTeam[team.id] ?? 0;
        const src = urls[urlIdx] ?? "";
        const accentRing = team.accent || "ring-glow/50";
        const tileBg =
          team.tileBg ||
          "bg-gradient-to-br from-slate-900 to-slate-950";

        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onSelect(team.id)}
            disabled={taken}
            aria-label={`Select ${team.id}`}
            title={team.id}
            className={[
              "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-white/20 p-2 shadow-inner shadow-black/50 transition",
              tileBg,
              selected ? `z-[1] scale-[1.03] ring-2 ${accentRing} ring-offset-2 ring-offset-[#090d1a]` : "",
              taken
                ? "cursor-not-allowed opacity-35 grayscale"
                : "hover:border-white/35 hover:brightness-110",
            ].join(" ")}
          >
            {/* subtle vignette so crests stay readable on bright gradients */}
            <span
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_20%,rgba(0,0,0,0.35)_100%)]"
              aria-hidden
            />
            {!showFallback && src ? (
              <img
                key={`${team.id}-${urlIdx}`}
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="relative z-[1] max-h-[88%] max-w-[88%] object-contain object-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
                style={{ imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }}
                onError={() => handleImageError(team.id, urls.length)}
              />
            ) : (
              <span className="relative z-[1] text-xs font-bold tracking-wide text-white drop-shadow-md">
                {team.short}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TeamLogoGrid;
