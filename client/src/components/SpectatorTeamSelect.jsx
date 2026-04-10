import React from "react";
import { IPL_TEAMS } from "../data/teams";

function SpectatorTeamSelect({ users, teamState, roomAuctionType, handleTeamChange }) {
  const [showList, setShowList] = React.useState(false);
  const buttonRef = React.useRef(null);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (!showList) return;
    function handleClickOutside(event) {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        listRef.current && !listRef.current.contains(event.target)
      ) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showList]);
  const availableTeams = IPL_TEAMS.filter(team =>
    !users.some(u => !u.isSpectator && u.team === team.id)
  );
  return (
    <div className="w-full bg-slate-800/80 border-b border-cyan-500/30 px-6 py-2.5 flex items-center justify-center gap-4 z-40 relative backdrop-blur-sm shadow-md">
      <span className="text-sm font-semibold text-cyan-200">Room not fully occupied? Pick a Team to continue:</span>
      <div className="relative min-w-[260px]">
        <button
          ref={buttonRef}
          className="appearance-none bg-slate-900 border border-cyan-500/60 hover:border-cyan-400 text-cyan-50 font-semibold text-xs rounded-md pl-2 pr-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer transition-colors shadow-inner w-full flex flex-row items-center justify-between min-h-0 h-8"
          onClick={() => setShowList(v => !v)}
          type="button"
        >
          <span className="truncate">Select Team</span>
          <span className="flex-shrink-0 flex items-center text-cyan-400">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {showList && (
          <div
            ref={listRef}
            className="absolute left-0 mt-2 w-full z-50 rounded-xl border border-cyan-500/40 bg-slate-900/95 shadow-2xl p-2 max-h-96 overflow-y-auto flex flex-col gap-1"
          >
            {availableTeams.length === 0 ? (
              <div className="text-xs text-slate-400 px-3 py-2">No teams available</div>
            ) : (
              availableTeams.map(team => {
                const tState = teamState[team.id] || {};
                const playerCount = Array.isArray(tState.players) ? tState.players.length : 0;
                const purseLeft = typeof tState.purseRemaining === 'number' ? tState.purseRemaining : (roomAuctionType === 'mini' ? 0 : 125);
                const logoUrl = (team.logoUrls && team.logoUrls.length > 0) ? team.logoUrls[0] : null;
                return (
                  <button
                    key={team.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-cyan-800/30 transition text-left"
                    onClick={() => { handleTeamChange(team.id); setShowList(false); }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={team.id} className="h-8 w-8 object-contain rounded-md" style={{ imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }} />
                    ) : (
                      <span className="h-8 w-8 flex items-center justify-center bg-slate-700 rounded-md text-xs font-bold text-white">{team.short}</span>
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-cyan-100 text-sm">{team.id}</span>
                      <span className="text-xs text-slate-300">{playerCount} players, ₹{purseLeft} Cr left</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpectatorTeamSelect;
