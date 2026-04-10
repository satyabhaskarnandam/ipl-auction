import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TeamLogoGrid from "../components/TeamLogoGrid";
import { SERVER_URL } from "../lib/socket";

const SESSION_KEY = "ipl-auction-session";

function BrowseRoomsPage() {
  const [isBrowsingRooms, setIsBrowsingRooms] = useState(true);
  const [isLeavingToHome, setIsLeavingToHome] = useState(false);
  const navigate = useNavigate();
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnectingRoom, setIsConnectingRoom] = useState(true);
  const connectingGateUntilRef = useRef(0);
  const hideConnectingTimeoutRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const releaseConnectingOverlay = useCallback(() => {
    const remaining = (connectingGateUntilRef.current || 0) - Date.now();
    if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
    if (remaining > 0) {
      hideConnectingTimeoutRef.current = setTimeout(() => {
        setIsConnectingRoom(false);
      }, remaining);
      return;
    }
    setIsConnectingRoom(false);
  }, []);

  useEffect(() => {
    connectingGateUntilRef.current = Date.now() + 2000;
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    setName(session.name || "");
  }, []);

  const fetchPublicRooms = useCallback(async ({ withPageLoader = false, minRefreshMs = 0 } = {}) => {
    const startTime = Date.now();
    try {
      if (withPageLoader) {
        setLoading(true);
      }
      if (minRefreshMs > 0) {
        setRefreshing(true);
      }
      setError("");
      const response = await fetch(`${SERVER_URL}/rooms/public?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch public rooms");
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error("Could not load public rooms. Server returned an invalid response.");
      }
      const data = await response.json();
      setPublicRooms(data.rooms || []);
    } catch (err) {
      setError("Could not load public rooms. Make sure server is running on port 5001.");
      setPublicRooms([]);
    } finally {
      if (minRefreshMs > 0) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minRefreshMs - elapsed);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
      }
      if (withPageLoader) {
        setLoading(false);
        releaseConnectingOverlay();
      }
      if (minRefreshMs > 0) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setIsBrowsingRooms(true);
    fetchPublicRooms({ withPageLoader: true });
    setTimeout(() => setIsBrowsingRooms(false), 2000);
  }, [fetchPublicRooms]);

  const handleJoinRoom = (roomId, availableTeams) => {
    if (!name.trim()) {
      setError("Please enter your name before joining");
      return;
    }

    if (!selectedTeam) {
      setError("Please select a team before joining");
      return;
    }

    if (!availableTeams.includes(selectedTeam)) {
      setError("Selected team is not available in this room");
      return;
    }

    // Store the room ID and navigate
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...session,
        name: name.trim(),
        roomId,
        team: selectedTeam,
      })
    );

    navigate(`/auction/${roomId}`, { state: { skipLoading: true } });
  };


  const handleBackToLobby = () => {
    setIsLeavingToHome(true);
    setIsConnectingRoom(false);
    setTimeout(() => navigate("/"), 0);
  };

  if ((isConnectingRoom && isBrowsingRooms) || isLeavingToHome) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(11,18,32,0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid rgba(34,211,238,0.2)',
            borderTopColor: '#22d3ee',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
            {isLeavingToHome ? "Returning to lobby..." : "Exploring public auctions..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Live Auction Arena</h1>
            <p className="mt-2 text-slate-400">
              Find and join a public auction room
            </p>
          </div>
          <button
            onClick={handleBackToLobby}
            className="mt-3 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            ← Back to Lobby
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-950/30 p-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <div className="mb-3">
          <label className="mb-2 block text-sm text-slate-300">Your Name</label>
          <div className="flex items-center gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-line bg-slate-900 px-4 py-3 outline-none focus:border-glow"
            />
            <button
              type="button"
              onClick={() => fetchPublicRooms({ minRefreshMs: 2000 })}
              disabled={loading || refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              title="Refresh public rooms"
              aria-label="Refresh public rooms"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 22v-6h6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L3 8" />
                <path d="M3.51 15a9 9 0 0 0 14.85 3.36L21 16" />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400"></div>
              </div>
              <p className="text-slate-400">Loading public rooms...</p>
            </div>
          </div>
        )}

        {/* No Rooms State */}
        {!loading && publicRooms.length === 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-lg text-slate-400">
              No public rooms available right now
            </p>
          </div>
        )}

        {/* Team Selection */}
        {!loading && publicRooms.length > 0 && (
          <div className="mb-8">
            <label className="block mb-2 text-sm font-semibold text-slate-300">
              Select your team
            </label>
            <TeamLogoGrid
              selectedTeam={selectedTeam}
              takenTeams={[]} // Will be validated per room
              onSelect={setSelectedTeam}
            />
          </div>
        )}

        {/* Rooms Grid */}
        {!loading && publicRooms.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...publicRooms]
              .sort((a, b) => {
                // If selectedTeam is set, prioritize rooms where selectedTeam is NOT already joined
                const aHasTeam = selectedTeam && a.teamsSelected && a.teamsSelected.includes(selectedTeam);
                const bHasTeam = selectedTeam && b.teamsSelected && b.teamsSelected.includes(selectedTeam);
                if (aHasTeam !== bHasTeam) {
                  return aHasTeam ? 1 : -1;
                }
                // Otherwise, sort by most teams joined
                return (b.totalTeamsJoined || 0) - (a.totalTeamsJoined || 0);
              })
              .map((room) => (
                <div
                  key={room.roomId}
                  className="flex flex-col rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 overflow-hidden transition hover:border-slate-600"
                >
                {/* Room Code - Top Left */}
                <div className="border-b border-slate-700 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-mono uppercase text-slate-500">
                    Room Code
                  </p>
                  <p className="mt-1 text-xl font-bold text-cyan-300">
                    {room.roomId}
                  </p>
                </div>

                {/* Room Info */}
                <div className="flex-1 px-4 py-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Auction Type
                    </p>
                    <p className="mt-1 text-sm capitalize text-slate-200">
                      {room.auctionType === "mega" ? "Mega Auction" : "Mini Auction"}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Teams Joined
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      {room.totalTeamsJoined} / {room.totalTeamSlots}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {room.teamsSelected.map((team) => (
                        <span
                          key={team}
                          className="inline-block rounded-full bg-cyan-900/30 px-2 py-1 text-xs text-cyan-200"
                        >
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Available Teams ({room.availableTeams.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {room.availableTeams.map((team) => (
                        <span
                          key={team}
                          className="inline-block rounded-full bg-slate-700/50 px-2 py-1 text-xs text-slate-300"
                        >
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Join Button */}
                <button
                  onClick={() => handleJoinRoom(room.roomId, room.availableTeams)}
                  disabled={!selectedTeam || !room.availableTeams.includes(selectedTeam)}
                  className={`border-t border-slate-700 px-4 py-3 text-sm font-semibold transition ${
                    selectedTeam && room.availableTeams.includes(selectedTeam)
                      ? "cursor-pointer bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/40"
                      : "cursor-not-allowed bg-slate-900/50 text-slate-500"
                  }`}
                >
                  Join Room
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowseRoomsPage;
