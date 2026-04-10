import { useState } from "react";
import ScrollWrapper from "./ScrollWrapper";
import { auctionSounds } from "../lib/auctionSounds";

function SettingsPanel({ timerSeconds, onTimerChange, isAdmin, roomId, socket, users, isAccelerated }) {
  const [timer, setTimer] = useState(timerSeconds ?? 10);
  const [msg, setMsg] = useState("");
  const [soundsOn, setSoundsOn] = useState(!auctionSounds._MUTED);

  const toggleSounds = () => {
    const nextOn = !soundsOn;
    setSoundsOn(nextOn);
    auctionSounds._MUTED = !nextOn;
  };

  const handleTimerChange = (seconds) => {
    if (!isAdmin || !roomId || isAccelerated) return;
    setTimer(seconds);
    setMsg("");
    socket.emit("setAuctionTimer", { roomId, timerSeconds: seconds }, (res) => {
      if (res?.ok) {
        setMsg(`Timer set to ${seconds}s`);
      } else {
        setMsg(res?.message || "Could not update timer");
      }
    });
  };

  const handleKickUser = (userId, userName) => {
    if (!isAdmin || !roomId) return;
    if (!window.confirm(`Are you sure you want to kick ${userName}?`)) return;
    
    socket.emit("kickUser", { roomId, userIdToKick: userId }, (res) => {
      if (res?.ok) {
        setMsg(`${userName} has been kicked out`);
      } else {
        setMsg(res?.message || "Could not kick user");
      }
    });
  };

  const franchisePlayers = (users || []).filter((u) => !u.isSpectator);
  const spectators = (users || []).filter((u) => u.isSpectator);

  return (
    <ScrollWrapper className="flex flex-1 min-h-0 flex-col p-4">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-slate-300">Preferences</p>
          <button
            type="button"
            onClick={toggleSounds}
            className={`w-full flex justify-between items-center bg-slate-800/80 px-4 py-3 rounded-xl border ${soundsOn ? 'border-cyan-500/50' : 'border-slate-700/50'} transition-all`}
          >
            <span className="text-white font-semibold flex items-center gap-2">🔊 Auction Sounds</span>
            <span className={`text-sm font-bold ${soundsOn ? 'text-emerald-400' : 'text-slate-500'}`}>{soundsOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-300">Bid timer (per player)</p>
          <div className="flex gap-2">
            {[5, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handleTimerChange(sec)}
                disabled={!isAdmin || isAccelerated}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  (timerSeconds ?? timer) === sec
                    ? "bg-glow text-white"
                    : "border border-line bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
          {isAccelerated && (
            <p className="mt-2 text-xs text-indigo-400 font-medium">Timer is fixed at 5s during accelerated round</p>
          )}
          {!isAccelerated && !isAdmin && (
            <p className="mt-2 text-xs text-slate-500">Only admin can change timer</p>
          )}
        </div>

        {isAdmin && franchisePlayers.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-slate-300">Manage Players</p>
            <ScrollWrapper className="space-y-2" maxHeight="12rem">
              {franchisePlayers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/50 p-2 text-xs"
                >
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-slate-400">{user.team}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleKickUser(user.userId, user.name)}
                    className="rounded-lg bg-red-900/60 px-3 py-1 text-red-200 hover:bg-red-800/80 transition text-xs font-semibold"
                  >
                    Kick
                  </button>
                </div>
              ))}
            </ScrollWrapper>
          </div>
        )}

        {spectators.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-slate-300">Spectators ({spectators.length})</p>
            <div className="space-y-1 text-xs text-slate-400">
              {spectators.map((user) => (
                <p key={user.userId}>{user.name}</p>
              ))}
            </div>
          </div>
        )}

        {msg && (
          <p className={`text-sm ${msg.includes("kicked") || msg.includes("set") ? "text-emerald-400" : "text-red-400"}`}>
            {msg}
          </p>
        )}
      </div>
    </ScrollWrapper>
  );
}

export default SettingsPanel;
