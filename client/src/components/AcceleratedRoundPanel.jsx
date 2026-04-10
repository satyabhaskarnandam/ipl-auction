import { useState, useEffect } from "react";
import { socket } from "../lib/socket";
import { formatAmount } from "../lib/formatAmount";
import ScrollWrapper from "./ScrollWrapper";

function AcceleratedRoundPanel({ roomId, isAdmin, currentTeam, acceleratedRound, unsoldPlayers = [] }) {
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  useEffect(() => {
    if (acceleratedRound?.playerSelections?.[currentTeam]) {
      setSelectedPlayers(new Set(acceleratedRound.playerSelections[currentTeam]));
    }
  }, [acceleratedRound, currentTeam]);

  const togglePlayerSelection = (playerId) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);

    socket.emit("selectAcceleratedPlayer", {
      roomId,
      playerId,
      selected: newSelected.has(playerId),
    });
  };

  const startAcceleratedRound = () => {
    socket.emit("startAcceleratedRound", { roomId });
  };

  const launchAcceleratedRound = () => {
    socket.emit("launchAcceleratedRound", { roomId });
  };

  const endAuction = () => {
    socket.emit("endAuction", { roomId });
  };

  if (!acceleratedRound?.active) {
    return (
      <div className="p-4">
        {isAdmin && (
          <div className="space-y-3">
            <button
              onClick={startAcceleratedRound}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Accelerated Round
            </button>
            <button
              onClick={endAuction}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              End Auction
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-500/30 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-2">⚡ Accelerated Round</h3>
        <p className="text-purple-200 text-sm mb-4">
          {acceleratedRound.started
            ? "Round in progress - faster bidding!"
            : "Select players you want to bid on:"
          }
        </p>

        {!acceleratedRound.started && (
          <ScrollWrapper className="space-y-2" maxHeight="15rem">
            {unsoldPlayers.map((player) => {
              const isSelected = selectedPlayers.has(player.id || `${player.name}-${player.country}`);
              return (
                <div
                  key={player.id || `${player.name}-${player.country}`}
                  onClick={() => togglePlayerSelection(player.id || `${player.name}-${player.country}`)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-purple-600/30 border-purple-400 shadow-lg"
                      : "bg-slate-800/50 border-slate-600 hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{player.name}</span>
                      <span className="text-slate-300 text-sm ml-2">
                        {player.role} • {player.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 text-sm">₹{formatAmount(player.basePrice)}</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? "border-purple-400 bg-purple-400" : "border-slate-500"
                      }`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollWrapper>
        )}

        {isAdmin && !acceleratedRound.started && (
          <button
            onClick={launchAcceleratedRound}
            className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Launch Accelerated Round
          </button>
        )}

        {acceleratedRound.started && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-purple-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Accelerated Round Active</span>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceleratedRoundPanel;