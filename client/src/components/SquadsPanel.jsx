import { useState } from "react";
import { IPL_TEAMS } from "../data/teams";
import { formatAmount } from "../lib/formatAmount";
import ScrollWrapper from "./ScrollWrapper";

const TEAM_NAMES = {
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  RCB: "Royal Challengers Bengaluru",
  KKR: "Kolkata Knight Riders",
  SRH: "Sunrisers Hyderabad",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  RR: "Rajasthan Royals",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
};

function SquadsPanel({ teamState, currentTeam, hostTeam, users = [] }) {
  const [expandedTeams, setExpandedTeams] = useState({});

  const toggleTeam = (teamId) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const isPlayerActive = (playerName, teamId) => {
    return users.some((u) => u.name === playerName && u.team === teamId && !u.isSpectator);
  };

  let teams = IPL_TEAMS.map((team) => {
    const state = teamState[team.id] || { purseRemaining: 125, players: [] };
    // If mega auction and purse is missing, default to 125
    const purseRemaining = typeof state.purseRemaining === 'number' ? state.purseRemaining : 125;
    return { ...team, purseRemaining, players: state.players || [] };
  });

  // Sort teams so current team is at the top
  if (currentTeam) {
    teams = teams.sort((a, b) => {
      if (a.id === currentTeam) return -1;
      if (b.id === currentTeam) return 1;
      return 0;
    });
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col p-4">
      <h3 className="mb-3 font-semibold">Squads</h3>
      <ScrollWrapper className="flex-1 space-y-3 pr-1">
        {teams.map((team) => (
          <div
            key={team.id}
            className={`rounded-xl border border-white/10 ${team.tileBg || "bg-slate-900/80"}`}
          >
            <button
              onClick={() => toggleTeam(team.id)}
              className="w-full p-3 text-left hover:bg-black/20 transition rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-white drop-shadow-md flex items-center gap-2">
                    {TEAM_NAMES[team.id] || team.id}
                    {team.id === hostTeam && (
                      <span className="text-xs bg-amber-600/70 px-2 py-0.5 rounded-full text-amber-50 font-semibold">Host</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-white/80">
                    Purse: ₹{formatAmount(team.purseRemaining ?? 125)} · {team.totalPlayers ?? 0}/25 players · {team.overseasCount ?? 0}/8 overseas
                  </p>
                </div>
                <span className="text-white/60 text-lg">
                  {expandedTeams[team.id] ? "▼" : "▶"}
                </span>
              </div>
            </button>
            {expandedTeams[team.id] && (
              <ul className="mt-0 space-y-1 text-xs px-3 pb-3">
                {(team.players || []).length === 0 ? (
                  <li className="text-center text-white/50">No players yet</li>
                ) : (
                  (team.players || []).map((p, i) => {
                    const active = isPlayerActive(p?.name, team.id);
                    const isForeignPlayer = p?.country && p?.country !== "India";
                    return (
                      <li key={`${p?.name}-${i}`} className="flex items-center justify-between text-white/90">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            active ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-red-500 shadow-lg shadow-red-500/50"
                          }`}></span>
                          <span className={active ? "text-white font-medium flex items-center gap-1" : "text-white/60 flex items-center gap-1"}>
                            {p?.name || "\u2014"}
                            {p?.role && (
                              <span className="ml-1 text-cyan-300/80 text-[11px] font-normal">({p.role})</span>
                            )}
                            {isForeignPlayer && (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold ml-1">
                                ✈
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-white/60">₹{p?.basePrice ? formatAmount(p.basePrice) : "—"}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        ))}
      </ScrollWrapper>
    </div>
  );
}

export default SquadsPanel;
