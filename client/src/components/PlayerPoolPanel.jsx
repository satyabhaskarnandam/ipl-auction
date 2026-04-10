import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { SERVER_URL, socket } from "../lib/socket";
import { formatAmount } from "../lib/formatAmount";
import { IPL_TEAMS } from "../data/teams";
import ScrollWrapper from "./ScrollWrapper";

const teamById = Object.fromEntries(IPL_TEAMS.map((t) => [t.id, t]));
const FIXED_SET_ORDER = [
  "Marquee Players",
  "Batsmen",
  "Fast Bowlers",
  "Spinners",
  "All Rounders",
  "Wicket Keepers",
  "Uncapped Players",
  "Unsold Players",
];

function TeamLogoBadge({ teamId, size = "sm" }) {
  const team = teamById[teamId];
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  if (!team) return <span className="text-slate-400">({teamId})</span>;
  
  const urls = team.logoUrls || [];
  let src = "";
  
  if (!imageError && urls.length > 0) {
    src = urls[0];
  } else if (imageError && urls.length > 1) {
    src = urls[1];
  }
  
  const isSm = size === "sm";
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-lg bg-transparent ${isSm ? "h-6 w-6" : "h-8 w-8"}`}
      title={teamId}
      style={{ backgroundColor: "transparent" }}
    >
      {src ? (
        <img 
          src={src} 
          alt={teamId}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
          className="h-full w-full object-contain bg-transparent scale-110" 
          style={{ backgroundColor: "transparent", imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }}
        />
      ) : (
        <>
          {src && !imageLoaded && (
            <img 
              src={src} 
              alt={teamId}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
              className="hidden" 
            />
          )}
          <span className="text-[10px] font-bold text-white">{team.short}</span>
        </>
      )}
    </span>
  );
}

function PlayerPoolPanel({ bootstrapSets = [], auctionType = "mega" }) {
  const { roomId } = useParams();
  const [baselineSetTotals, setBaselineSetTotals] = useState({});
  const [baselineTotalPlayers, setBaselineTotalPlayers] = useState(null);
  const [data, setData] = useState(() => {
    if (!Array.isArray(bootstrapSets) || bootstrapSets.length === 0) return null;
    return {
      sets: bootstrapSets,
      totalPlayers: bootstrapSets.reduce(
        (sum, set) => sum + (Number.isFinite(set.totalPlayers) ? set.totalPlayers : 0),
        0
      ),
    };
  });
  const [error, setError] = useState("");
  const [openSet, setOpenSet] = useState(null);
  const hasLiveSetsUpdateRef = useRef(false);
  const snapshotRetryTimerRef = useRef(null);
  const snapshotAckTimeoutRef = useRef(null);
  const staticFallbackTimerRef = useRef(null);

  const applyLiveSets = useCallback((setsPayload) => {
    hasLiveSetsUpdateRef.current = true;
    setData((prev) => ({
      ...prev,
      sets: setsPayload,
      totalPlayers: setsPayload.reduce(
        (sum, set) => sum + (Number.isFinite(set.totalPlayers) ? set.totalPlayers : 0),
        0
      ),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadBaselineTotals = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/players/sets?auctionType=${auctionType}&_ts=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) return;
        const baselineTotals = Array.isArray(json?.sets)
          ? Object.fromEntries(
              json.sets.map((set) => [
                set.setName,
                Number.isFinite(set.totalPlayers)
                  ? set.totalPlayers
                  : (Array.isArray(set.players) ? set.players.length : 0),
              ])
            )
          : {};
        if (!cancelled) {
          setBaselineSetTotals(baselineTotals);
          setBaselineTotalPlayers(Number.isFinite(json?.totalPlayers) ? json.totalPlayers : null);
        }
      } catch {
        // Ignore transient baseline fetch errors and keep live/snapshot totals.
      }
    };

    void loadBaselineTotals();
    return () => {
      cancelled = true;
    };
  }, [auctionType]);

  useEffect(() => {
    const normalizedRoomId = String(roomId || "").trim().toUpperCase();
    let cancelled = false;



    const loadStaticPool = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/players/sets?auctionType=${auctionType}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Could not load player pool");
        }
        if (!cancelled && !hasLiveSetsUpdateRef.current) {
          setData(json);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError("");
          setData({
            totalPlayers: 0,
            totalSets: FIXED_SET_ORDER.length,
            sets: FIXED_SET_ORDER.map((name) => ({ setName: name, players: [], totalPlayers: 0 })),
          });
        }
      }
    };

    if (normalizedRoomId) {
      // If we are in a room, we ONLY rely on socket updates (getSetsSnapshot/setsUpdate)
      // to ensure the shuffle and counts are perfectly stable across refreshes.
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      await loadStaticPool();
    })();

    return () => {
      cancelled = true;
    };
  }, [auctionType, roomId]);

  useEffect(() => {
    const normalizedRoomId = String(roomId || "").trim().toUpperCase();
    hasLiveSetsUpdateRef.current = false;

    const handleSetsUpdate = (payload) => {
      if (!Array.isArray(payload?.sets) || payload.sets.length === 0) return;
      const payloadRoomId = String(payload?.roomId || "").trim().toUpperCase();
      if (normalizedRoomId && payloadRoomId && payloadRoomId !== normalizedRoomId) return;
      applyLiveSets(payload.sets);
    };

    socket.on("setsUpdate", handleSetsUpdate);

    let attempts = 0;
    const maxAttempts = 20;
    const retryDelayMs = 500;
    const ackTimeoutMs = 800;

    const clearSnapshotTimers = () => {
      if (snapshotRetryTimerRef.current) {
        clearTimeout(snapshotRetryTimerRef.current);
        snapshotRetryTimerRef.current = null;
      }
      if (snapshotAckTimeoutRef.current) {
        clearTimeout(snapshotAckTimeoutRef.current);
        snapshotAckTimeoutRef.current = null;
      }
    };

    const requestSnapshot = () => {
      if (!normalizedRoomId) return;
      if (hasLiveSetsUpdateRef.current) return;
      if (attempts >= maxAttempts) return;

      attempts += 1;
      let callbackHandled = false;

      if (snapshotAckTimeoutRef.current) {
        clearTimeout(snapshotAckTimeoutRef.current);
        snapshotAckTimeoutRef.current = null;
      }

      snapshotAckTimeoutRef.current = setTimeout(() => {
        if (callbackHandled || hasLiveSetsUpdateRef.current) return;
        snapshotRetryTimerRef.current = setTimeout(requestSnapshot, retryDelayMs);
      }, ackTimeoutMs);

      socket.emit("getSetsSnapshot", { roomId: normalizedRoomId }, (response) => {
        callbackHandled = true;
        if (snapshotAckTimeoutRef.current) {
          clearTimeout(snapshotAckTimeoutRef.current);
          snapshotAckTimeoutRef.current = null;
        }

        if (response?.ok && Array.isArray(response.sets)) {
          if (response.sets.length > 0) {
            applyLiveSets(response.sets);
          }
          return;
        }

        if (attempts >= maxAttempts || hasLiveSetsUpdateRef.current) return;
        snapshotRetryTimerRef.current = setTimeout(requestSnapshot, retryDelayMs);
      });
    };

    const onSocketConnect = () => {
      if (hasLiveSetsUpdateRef.current) return;
      clearSnapshotTimers();
      requestSnapshot();
    };

    socket.on("connect", onSocketConnect);
    requestSnapshot();

    return () => {
      socket.off("setsUpdate", handleSetsUpdate);
      socket.off("connect", onSocketConnect);
      clearSnapshotTimers();
    };
  }, [applyLiveSets, auctionType, roomId]);

  useEffect(() => {
    if (!Array.isArray(bootstrapSets) || bootstrapSets.length === 0) return;
    applyLiveSets(bootstrapSets);
  }, [applyLiveSets, auctionType, bootstrapSets]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
        Player pool: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-slate-400">
        Loading player pool…
      </div>
    );
  }

  const serverSets = Array.isArray(data?.sets) ? data.sets : [];
  const sets = FIXED_SET_ORDER.map((name) => {
    const found = serverSets.find((set) => set.setName === name);
    const players = Array.isArray(found?.players) ? found.players : [];
    const liveTotalPlayers = Number.isFinite(found?.totalPlayers)
      ? found.totalPlayers
      : players.length;
    const baselineTotalPlayers = Number.isFinite(baselineSetTotals?.[name])
      ? baselineSetTotals[name]
      : 0;
    const totalPlayers = found ? liveTotalPlayers : baselineTotalPlayers;

    return {
      setName: name,
      players,
      totalPlayers,
      soldCount: Number.isFinite(found?.soldCount) ? found.soldCount : 0,
      unsoldCount: Number.isFinite(found?.unsoldCount) ? found.unsoldCount : 0,
    };
  });

  // Always sum unique players. Since players now "move" to the Unsold set,
  // summing all sets (including Unsold) gives the correct unique total.
  const totalPlayers = sets.reduce(
    (sum, set) => sum + (Number.isFinite(set.totalPlayers) ? set.totalPlayers : (Array.isArray(set.players) ? set.players.length : 0)),
    0
  );
  const totalSets = sets.length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-white">Auction player pool</h2>
        <p className="text-base text-slate-400">
          {totalPlayers} players · {totalSets} sets
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Order: Marquee Players → Batsmen → Fast Bowlers → Spinners → All Rounders →
        Wicket Keepers → Uncapped Players → Unsold Players
      </p>

      <ul className="mt-4 flex flex-col gap-2 flex-1">
        {sets.map((set) => {
          const key = set.setName;
          const isOpen = openSet === key;
          return (
            <li key={key} className="rounded-xl border border-line bg-slate-900/80 flex-1 flex flex-col">
              <button
                type="button"
                onClick={() => setOpenSet(isOpen ? null : key)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-base font-semibold text-slate-100 hover:bg-slate-800/80"
              >
                <span>
                  {set.setName}{" "}
                  <span className="font-normal text-slate-400">
                    ({set.totalPlayers ?? set.players?.length ?? 0})
                  </span>
                  {/* Sold/Unsold text explicitly removed as per requirements */}
                </span>
                <span className="text-slate-500">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && Array.isArray(set.players) ? (
                <ScrollWrapper className="border-t border-line px-3 py-2 text-sm text-slate-300" maxHeight="15rem">
                  <ol className="list-decimal space-y-2 pl-5">
                    {set.players.map((p) => {
                      const isForeignPlayer = p.country && p.country !== "India";
                      const isSold = Boolean(p.soldTo && p.soldPrice != null && p.status === "SOLD");
                      const isUnsold = p.isUnsold || p.status === "UNSOLD" || set.setName === "Unsold Players";
                      
                      return (
                        <li key={p.id} className="pb-1">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-50 leading-tight">{p.name}</span>
                            {isForeignPlayer && (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600">
                                <span className="text-white text-[11px] font-bold">✈</span>
                              </span>
                            )}
                            {isUnsold && (
                              <span className="rounded bg-amber-500/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shrink-0">
                                Unsold
                              </span>
                            )}
                            {isSold && (
                              <>
                                <span className="text-slate-500 shrink-0">→</span>
                                <span className="font-bold text-emerald-400 shrink-0">
                                  {teamById[p.soldTo]?.name || p.soldTo} (₹{formatAmount(p.soldPrice)})
                                </span>
                              </>
                            )}
                          </span>
                          <span className="text-slate-400/90 text-[13px] block mt-0.5">
                            {p.role} · {p.country} · ₹{formatAmount(p.basePrice)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </ScrollWrapper>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default memo(PlayerPoolPanel);
