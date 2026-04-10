import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TeamLogoGrid from "../components/TeamLogoGrid";
import AnimatedIPLLogo from "../components/AnimatedIPLLogo";
import PremiumCTA from "../components/PremiumCTA";
import { socket, SERVER_URL } from "../lib/socket";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "ipl-auction-session";

const makeRoomId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();
const makeUserId = () =>
  `u_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const normalizeRoomInput = (raw = "") => {
  const value = String(raw || "").trim();
  if (!value) return "";
  const fromPath = value.match(/\/auction\/([A-Za-z0-9_-]{4,12})/i);
  if (fromPath?.[1]) return fromPath[1].toUpperCase();
  const fromQuery = value.match(/[?&]roomId=([A-Za-z0-9_-]{4,12})/i);
  if (fromQuery?.[1]) return fromQuery[1].toUpperCase();
  return value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase();
};

const FEATURES = [
  {
    title: "Accelerated Rounds",
    desc: "Quick-fire bidding logic for unsold talent to finish squads after the main rounds, ensuring no star performer is left behind.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: "AI Auto-Commentary",
    desc: "Live, context-aware commentary for every bid and major event, providing an immersive broadcasting feel to your auction.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    )
  },
  {
    title: "AI-Powered Analyst",
    desc: "Real-time squad evaluation and team potential ratings powered by advanced scouting logic and historical performance data.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    title: "Community Feedback",
    desc: "Rate your experience and share suggestions in real-time. Help us shape the future of the Arena with our intuitive post-auction feedback system.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )
  },
  {
    title: "Dynamic Budgeting",
    desc: "Automatically track your remaining purse with real-time updates. Stay on top of your financials to ensure you always have enough for your top targets.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: "Interactive Arena",
    desc: "Live chat and spectator modes for a social auction experience, allowing for real-time reactions and calculated banter.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    )
  },
  {
    title: "Mega & Mini Modes",
    desc: "Full squad reshuffles or precise tactical additions, perfectly tailored for both pre-season drafts and mid-season trades.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    title: "No Sign-Up Required",
    desc: "Jump straight into the action with instant room creation. No accounts, emails, or personal data ever required to play.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    )
  },
  {
    title: "Strategy Snapshots",
    desc: "Download and share your completed final XI with one click, featuring professional-grade branding and team-specific aesthetic.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    )
  },
  {
    title: "Works on Any Device",
    desc: "Seamless performance across mobile, tablet, and desktop browsers with a fully responsive and optimized interface.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
];

function FeedbackSection() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filterRating, setFilterRating] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/feedback`);
        const data = await res.json();
        if (data.ok) {
          setFeedbacks(data.feedbacks);
        }
      } catch (err) {
        console.error("Feedback fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  const stats = useMemo(() => {
    if (!feedbacks.length) return null;
    const total = feedbacks.length;
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const avg = (sum / total).toFixed(1);
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach(f => {
      if (distribution[f.rating] !== undefined) distribution[f.rating]++;
    });
    return { avg, total, distribution };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    if (filterRating === "All") return feedbacks;
    return feedbacks.filter(f => f.rating === parseInt(filterRating));
  }, [feedbacks, filterRating]);

  if (isLoading) return null;

  return (
     <div className="mt-16 mb-24 max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <div className="mb-10 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white sm:text-3xl">
                Arena <span className="text-emerald-400">Wall of Fame</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">What our elite team owners are saying about their auction experience.</p>
        </div>

        {/* Stats Block */}
        {stats && (
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row gap-12 items-center md:items-stretch mb-12">
                <div className="flex flex-col items-center justify-center md:border-r border-white/10 md:pr-12 min-w-[180px]">
                    <div className="flex items-center gap-3">
                        <span className="text-6xl font-black text-white leading-none">{stats.avg}</span>
                        <span className="text-4xl text-emerald-400">★</span>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{stats.total} Ratings</p>
                        <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-[0.2em]">{feedbacks.filter(f => f.comment).length} Reviews</p>
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col gap-3 justify-center">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = stats.distribution[star];
                        const percentage = ((count / stats.total) * 100).toFixed(0);
                        const barColors = {
                            5: "bg-emerald-500",
                            4: "bg-teal-500",
                            3: "bg-cyan-500",
                            2: "bg-amber-500",
                            1: "bg-rose-500"
                        };
                        return (
                            <div key={star} className="flex items-center gap-4 group">
                                <div className="flex items-center gap-1 min-w-[32px]">
                                    <span className="text-xs font-bold text-white transition-colors">{star}</span>
                                    <span className="text-[10px] text-slate-600 group-hover:text-yellow-500 transition-colors">★</span>
                                </div>
                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className={`h-full ${barColors[star]} opacity-80 shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 min-w-[30px] text-right">{count}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* Filter Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
            {["All", "5", "4", "3", "2", "1"].map(rating => (
                <button
                    key={rating}
                    onClick={() => setFilterRating(rating)}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        filterRating === rating 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 scale-105 shadow-lg shadow-emerald-500/20" 
                        : "bg-slate-900/40 border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300"
                    }`}
                >
                    {rating === "All" ? "All Reviews" : `${rating} ★`}
                </button>
            ))}
        </div>

        {/* Reviews List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
                {filteredFeedbacks.map((f) => (
                    <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-xl border border-white/5 bg-slate-900/30 p-5 hover:border-white/10 transition-colors relative overflow-hidden group hover:bg-slate-900/40"
                    >
                        <div className="flex items-start justify-between mb-3 relative z-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white uppercase tracking-tight">{f.username}</span>
                                    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded-md bg-slate-800/80 font-black tracking-[0.2em]">{f.team}</span>
                                </div>
                                <div className="flex items-center gap-0.5 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className={`text-[10px] ${i < f.rating ? "text-amber-400" : "text-slate-700"}`}>★</span>
                                    ))}
                                </div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">{new Date(f.createdAt).toLocaleDateString()}</span>
                        </div>
                        {f.comment && (
                            <p className="text-xs leading-relaxed text-slate-300 italic relative z-10">"{f.comment}"</p>
                        )}
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <span className="text-4xl font-black text-white italic"># {f.id}</span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            
            {filteredFeedbacks.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-600 text-sm italic border border-dashed border-white/5 rounded-2xl">
                    No reviews in this category yet.
                </div>
            )}
        </div>
     </div>
  );
}

function LobbyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [roomId, setRoomId] = useState("");
  const [takenTeams, setTakenTeams] = useState([]);
  const [joinAsSpectator, setJoinAsSpectator] = useState(false);
  const [roomVisibility, setRoomVisibility] = useState("public");
  const [auctionType, setAuctionType] = useState("mega");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicRoomCount, setPublicRoomCount] = useState(0);
  const [isConnectingRoom, setIsConnectingRoom] = useState(true);
  const [isReturningHome, setIsReturningHome] = useState(false);
  const connectingGateUntilRef = useRef(0);
  const hideConnectingTimeoutRef = useRef(null);
  const [resumeRoomId, setResumeRoomId] = useState("");
  const roomInputRef = useRef(null);

  // New Modal States
  const [showMegaRulesModal, setShowMegaRulesModal] = useState(false);
  const [showMiniRulesModal, setShowMiniRulesModal] = useState(false);
  const [showFullGuide, setShowFullGuide] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Standardize Error Auto-Dismissal (2 Seconds)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const releaseConnectingOverlay = () => {
    const remaining = (connectingGateUntilRef.current || 0) - Date.now();
    if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
    if (remaining > 0) {
      hideConnectingTimeoutRef.current = setTimeout(() => {
        setIsConnectingRoom(false);
      }, remaining);
      return;
    }
    setIsConnectingRoom(false);
  };

  const waitForSocket = (timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      if (socket.connected) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Could not connect to server"));
      }, timeoutMs);

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onConnectError = () => {
        cleanup();
        reject(new Error("Could not connect to server"));
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        socket.off("connect", onConnect);
        socket.off("connect_error", onConnectError);
      };

      socket.on("connect", onConnect);
      socket.on("connect_error", onConnectError);
      socket.connect();
    });

  const emitWithAckTimeout = (eventName, payload, timeoutMs = 1800) =>
    new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Server timeout. Please try again."));
      }, timeoutMs);

      socket.emit(eventName, payload, (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(response || {});
      });
    });

  const roomIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return normalizeRoomInput(params.get("roomId") || "");
  }, [location.search]);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setName(data.name || "");
      setTeam(data.team || "");
      setRoomId(data.roomId || "");
      setJoinAsSpectator(Boolean(data.isSpectator));
      setRoomVisibility(data.roomVisibility === "private" ? "private" : "public");
      setAuctionType(data.auctionType === "mini" ? "mini" : "mega");
      setResumeRoomId(String(data.roomId || "").toUpperCase());
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setResumeRoomId("");
    }
  }, []);

  useEffect(() => {
    if (roomIdFromUrl) {
      setRoomId(roomIdFromUrl);
    }
  }, [roomIdFromUrl]);

  useEffect(() => {
    const onTeamUpdate = (payload) => {
      setTakenTeams(payload.teamsSelected || []);
    };
    socket.on("teamUpdate", onTeamUpdate);
    return () => socket.off("teamUpdate", onTeamUpdate);
  }, []);

  useEffect(() => {
    const onPublicRoomCount = (payload) => {
      setPublicRoomCount(payload.count || 0);
    };
    socket.on("publicRoomCount", onPublicRoomCount);
    return () => socket.off("publicRoomCount", onPublicRoomCount);
  }, []);

  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/rooms/public/count`);
        const data = await res.json();
        if (data.ok) {
          setPublicRoomCount(data.count || 0);
        }
      } catch (err) {
        console.error("Initial count fetch error:", err);
      }
    };
    fetchInitialCount();
  }, []);

  useEffect(() => {
    connectingGateUntilRef.current = Date.now() + 2000;
    if (!socket.connected) {
      socket.connect();
    }
    // Release after 2s minimum
    releaseConnectingOverlay();
  }, []);

  const joinRoom = async (joinRoomId, options = {}) => {
    const spectator = options.spectator ?? joinAsSpectator;
    const chosenTeam = options.teamOverride ?? team;
    setError("");

    try {
      await waitForSocket();
    } catch (err) {
      setError(err?.message || "Could not connect to server");
      return false;
    }
    
    const stored = localStorage.getItem(SESSION_KEY);
    let stableUserId = "";
    if (stored) {
      try {
        stableUserId = JSON.parse(stored).userId || "";
      } catch {
        stableUserId = "";
      }
    }
    stableUserId = options.userIdOverride || stableUserId || makeUserId();

    return new Promise((resolve) => {
      socket.emit(
        "joinRoom",
        {
          userId: stableUserId,
          roomId: joinRoomId,
          name: name.trim(),
          team: spectator ? "" : chosenTeam,
          spectator,
          expectedRoomVisibility: roomVisibility,
        },
        (response) => {
          if (!response?.ok) {
            const errorMsg = response?.message || "Could not join room";
            setError(errorMsg);
            resolve(false);
            return;
          }

          const isAdmin = response.room.adminUserId === stableUserId;
          const isSpectatorUser = Boolean(spectator);

          const sessionData = {
            roomId: joinRoomId,
            userId: stableUserId,
            name: name.trim(),
            team: isSpectatorUser ? "SPEC" : chosenTeam,
            auctionType: response?.room?.auctionType === "mini" ? "mini" : "mega",
            isSpectator: isSpectatorUser,
            role: isAdmin ? "admin" : isSpectatorUser ? "spectator" : "user",
          };

          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
          navigate(`/auction/${joinRoomId}`, { state: { skipLoading: true } });
          resolve(true);
        }
      );
    });
  };
  
  // Helper to handle auction transition with rules check
  const handleAuctionEntry = (action, typeOverride = null) => {
    const effectiveType = typeOverride || auctionType;
    if (effectiveType === "mega") {
      setPendingAction(() => action);
      setShowMegaRulesModal(true);
    } else if (effectiveType === "mini") {
      setPendingAction(() => action);
      setShowMiniRulesModal(true);
    } else {
      action();
    }
  };

  const onCreateRoom = async () => {
    if (!name.trim()) {
      setError("Name is required to create a room");
      return;
    }
    if (!joinAsSpectator && !team) {
      setError("Select a team, or enable spectator mode");
      return;
    }

    const performCreate = async () => {
      if (isSubmitting) return;

      // Ensure Create Auction never reuses any previous room/session state.
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.clear(); // Clear any transient session state as well
      setResumeRoomId("");

      setIsSubmitting(true);
      setError("");

      try {
        await waitForSocket(1800);
      } catch (err) {
        setError(err?.message || "Could not connect to server");
        setIsSubmitting(false);
        return;
      }

      const preferredRoomId = makeRoomId();
      setRoomId(preferredRoomId);
      const stableUserId = makeUserId();

      try {
        let createResponse = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const candidateRoomId = attempt === 0 ? preferredRoomId : makeRoomId();
          const res = await emitWithAckTimeout("createRoom", {
            roomId: candidateRoomId,
            name: name.trim(),
            team: joinAsSpectator ? "" : team,
            userId: stableUserId,
            roomVisibility,
            auctionType,
            spectator: joinAsSpectator,
          });

          if (res?.ok) {
            createResponse = res;
            break;
          }

          const msg = String(res?.message || "");
          if (msg !== "Room already exists") {
            throw new Error(res?.message || "Could not create room");
          }
        }

        if (!createResponse?.ok) {
          throw new Error("Could not create room. Please try again.");
        }

        const createdRoomId = String(createResponse.roomId || preferredRoomId).toUpperCase();
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            roomId: createdRoomId,
            userId: stableUserId,
            name: name.trim(),
            team: joinAsSpectator ? "SPEC" : team,
            roomVisibility,
            auctionType,
            isSpectator: joinAsSpectator,
            role: "admin",
          })
        );

        setRoomId(createdRoomId);
        setResumeRoomId(createdRoomId);
        
        // Small delay to ensure localStorage is flushed and state settles before navigation
        setTimeout(() => {
          navigate(`/auction/${createdRoomId}`, { state: { skipLoading: true } });
        }, 50);
      } catch (err) {
        setError(err?.message || "Could not create room");
      } finally {
        setIsSubmitting(false);
      }
    };

    handleAuctionEntry(performCreate);
  };

  const onResumePreviousAuction = () => {
    const normalized = normalizeRoomInput(resumeRoomId);
    if (!normalized) return;
    
    let savedType = "mega";
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        savedType = data.auctionType || "mega";
      }
    } catch (e) {
      console.error("Resume error:", e);
    }

    const performResume = () => {
      navigate(`/auction/${normalized}`, { state: { skipLoading: true } });
    };

    handleAuctionEntry(performResume, savedType);
  };

  const onBrowseOtherRooms = () => {
    navigate("/browse-rooms");
  };

  const onJoinRoom = async () => {
    const normalizedRoomId = normalizeRoomInput(roomId);
    if (!name.trim()) {
      setError("Please enter your name to join");
      return;
    }
    if (!normalizedRoomId) {
      setError("Please enter a valid Room ID or link to join");
      return;
    }
    if (!joinAsSpectator && !team) {
      setError("Select a team, or enable spectator mode when 10 teams are full");
      return;
    }

    const performJoin = async () => {
      setRoomId(normalizedRoomId);
      await joinRoom(normalizedRoomId);
    };

    setIsSubmitting(true);
    try {
      await waitForSocket();
      socket.emit("getRoomInfo", { roomId: normalizedRoomId }, (res) => {
        setIsSubmitting(false);
        if (res?.ok) {
          handleAuctionEntry(performJoin, res.auctionType);
        } else {
          setError(res?.message || "Room not found");
        }
      });
    } catch (err) {
      setError(err?.message || "Could not connect to server");
      setIsSubmitting(false);
    }
  };


    if (isReturningHome || isConnectingRoom) {
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(11,18,32,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'rgba(22, 28, 48, 0.82)',
              borderRadius: '12px',
              padding: '18px 38px',
              boxShadow: '0 2px 18px 0 rgba(0,0,0,0.18)',
              border: '1.5px solid rgba(34,211,238,0.18)',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '3px solid rgba(34,211,238,0.2)',
                borderTopColor: '#22d3ee',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '-0.01em',
                display: 'inline-block',
              }}
            >
              {location.state?.fromAuction ? "Returning to Home" : "Entering the Arena..."}
            </span>
          </div>
        </div>
      );
    }

  return (
    <main className="mx-auto w-full max-w-3xl px-2 py-1 sm:px-4 sm:py-2">
      <div className="rounded-2xl border border-line bg-panel p-2 shadow-2xl sm:p-3">
        <div className="mb-1 grid grid-cols-[80px_auto_80px] items-center">
          <div className="translate-x-[11.75rem] translate-y-2 justify-self-end">
            <AnimatedIPLLogo />
          </div>
          <h1 className="text-center text-xl font-extrabold tracking-wide">
            IPL Auction Lobby
          </h1>
          <div aria-hidden="true" className="h-[80px] w-[80px]"></div>
        </div>
        {/* Welcome Note */}
        <div className="-translate-y-1 rounded-lg border border-cyan-500/20 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-1.5">
          <p className="text-xs leading-tight text-slate-200">
            <span className="font-semibold text-cyan-300">Welcome to IPL Auction! 🎯</span>
            <br />
            Create a new room or join an existing one to start bidding. You can create
            <span className="font-semibold text-cyan-200"> Mega Auctions</span>
            {" "}or
            <span className="font-semibold text-cyan-200"> Mini Auctions</span>
            , and choose whether your room is
            <span className="font-semibold text-cyan-200"> public</span>
            {" "}or
            <span className="font-semibold text-cyan-200"> private</span>.
            Browse public rooms to find and join auctions created by other users.
          </p>
        </div>

        <p className="translate-y-3 text-center text-xs text-slate-300">
          Enter your details and select your team — or join as a spectator once all
          10 franchises are taken (max 5 spectators).
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm text-slate-300">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-xl border border-line bg-slate-900 px-4 py-3 outline-none focus:border-glow"
          />
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-slate-900/60 px-4 py-3">
          <input
            type="checkbox"
            checked={joinAsSpectator}
            onChange={(e) => {
              setJoinAsSpectator(e.target.checked);
              if (e.target.checked) setTeam("");
            }}
            className="mt-1"
          />
          <span className="text-sm text-slate-200">
            <span className="font-semibold text-white">Join as spectator</span>
            <span className="block text-slate-400">
              Only works when the room already has 10 teams. You can watch and chat
              but not bid. Up to 5 spectators per room.
            </span>
          </span>
        </label>

        <div className="mt-6">
          <p className="mb-2 text-sm text-slate-300">Room Type</p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRoomVisibility("public")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${roomVisibility === "public" ? "border-cyan-400/60 bg-cyan-900/40 text-cyan-100" : "border-line bg-slate-900 text-slate-200 hover:bg-slate-800"}`}
              title="Public room"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15 15 0 0 1 0 20" />
                <path d="M12 2a15 15 0 0 0 0 20" />
              </svg>
              Public
            </button>
            <button
              type="button"
              onClick={() => setRoomVisibility("private")}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${roomVisibility === "private" ? "border-amber-400/70 bg-amber-900/30 text-amber-100" : "border-line bg-slate-900 text-slate-200 hover:bg-slate-800"}`}
              title="Private room"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
              Private
            </button>
          </div>
          <p className="mb-2 text-sm text-slate-300">Type of Auction</p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAuctionType("mega")}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${auctionType === "mega" ? "border-cyan-400/60 bg-cyan-900/40 text-cyan-100" : "border-line bg-slate-900 text-slate-200 hover:bg-slate-800"}`}
            >
              Mega Auction
            </button>
            <button
              type="button"
              onClick={() => setAuctionType("mini")}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${auctionType === "mini" ? "border-cyan-400/60 bg-cyan-900/40 text-cyan-100" : "border-line bg-slate-900 text-slate-200 hover:bg-slate-800"}`}
            >
              Mini Auction
            </button>
          </div>

          <div 
            onClick={() => navigate("/support")}
            role="button"
            className="group mb-5 mt-5 flex items-center justify-between rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-900/10 to-blue-900/10 px-4 py-3 shadow-sm transition-all hover:border-cyan-500/50 hover:from-cyan-900/30 hover:to-blue-900/30 active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl inline-block -mt-1 drop-shadow-md transition-transform group-hover:scale-110">🍕</span>
              <span className="font-semibold text-cyan-50 tracking-tight transition-colors group-hover:text-white">Love the Arena? Buy us a slice of pizza!</span>
            </div>
            <div className="rounded-lg bg-cyan-600/30 border border-cyan-500/40 px-4 py-1.5 text-sm font-bold text-cyan-100 transition-all group-hover:bg-cyan-500/60 shadow-lg shadow-transparent group-hover:shadow-cyan-900/50">
              Support
            </div>
          </div>

          {!joinAsSpectator ? (
            <>
              <p className="mb-3 text-sm text-slate-300">Select your team</p>
              <TeamLogoGrid
                selectedTeam={team}
                takenTeams={takenTeams}
                onSelect={setTeam}
              />
            </>
          ) : (
            <p className="mt-6 text-sm text-amber-200/90">
              Team pick is disabled in spectator mode.
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            ref={roomInputRef}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ROOM ID or join link"
            className="rounded-xl border border-line bg-slate-900 px-4 py-3 uppercase outline-none focus:border-glow"
          />
          <button
            type="button"
            onClick={onJoinRoom}
            disabled={isSubmitting}
            className="rounded-xl bg-slate-700 px-5 py-3 font-semibold hover:bg-slate-600"
          >
            Join Auction
          </button>
          <button
            type="button"
            onClick={onCreateRoom}
            disabled={isSubmitting}
            className="rounded-xl bg-glow px-5 py-3 font-semibold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create Auction"}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {resumeRoomId ? (
            <button
              type="button"
              onClick={onResumePreviousAuction}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-cyan-400/40 bg-cyan-950/40 px-5 py-3 font-semibold text-cyan-100 hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Resume Previous Auction ({resumeRoomId})
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBrowseOtherRooms}
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-400/40 bg-teal-950/35 px-5 py-3 font-semibold text-teal-100 hover:bg-teal-900/50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15 15 0 0 1 0 20" />
              <path d="M12 2a15 15 0 0 0 0 20" />
            </svg>
            Explore Live Auctions ({publicRoomCount})
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="mt-12 mb-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white sm:text-3xl">
            Ultimate Auction <span className="text-cyan-400">Experience</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">Everything you need to build the next IPL dynasty.</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ 
                type: "tween",
                ease: "linear",
                duration: 0.3,
                delay: (i % 4) * 0.05 
              }}
              className="group relative rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:bg-slate-800/60 hover:border-cyan-500/20 shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/80 border border-white/5 group-hover:border-cyan-500/30 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2 tracking-tight group-hover:text-cyan-300 transition-colors">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="mt-16 mb-8 text-center max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-900/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          New to the Auction?
        </div>
        <h2 className="text-3xl font-black text-white mb-4 italic uppercase tracking-tighter">Master the Hammer</h2>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm sm:text-base">
          Learn the high-stakes mechanics of real-time bidding, purse management, and squad building to dominate your rivals.
        </p>
        <button
          onClick={() => setShowFullGuide(!showFullGuide)}
          className="group relative flex items-center gap-3 mx-auto px-8 py-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-bold transition-all hover:bg-slate-800 hover:border-cyan-500/50"
        >
          {showFullGuide ? "Hide Guide" : "Read Full Guide"}
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-300 ${showFullGuide ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {showFullGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 px-4">
              {[
                {
                  title: "Forge Your Legacy",
                  desc: "Initialize your auction room by selecting your franchise identity. Your journey to the IPL trophy starts with a single decisive click.",
                  icon: (
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  )
                },
                {
                  title: "Summon Strategists",
                  desc: "Rally your rivals to the auction table. Share your unique code and prepare for an intense multiplayer bidding showdown.",
                  icon: (
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  )
                },
                {
                  title: "Select Your Format",
                  desc: "Choose between the Mega Auction for a complete franchise reset or the Mini Auction for strategic squad reinforcements.",
                  icon: (
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                  )
                },
                {
                  title: "Engage the Hammer",
                  desc: "Face off in real-time auctions. Keep your nerves steady as the timer counts down and the bidding war intensifies.",
                  icon: (
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/20">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                        <path d="M1 21h12a1 1 0 0 1 0 2H1a1 1 0 0 1 0-2zm18.1-13.1a1 1 0 0 1 0 1.41l-2.12 2.12 1.41 1.41-2.12 2.12-1.41-1.41-4.24 4.24c-.39.39-1.02.39-1.41 0l-2.83-2.83c-.39-.39-.39-1.02 0-1.41l4.24-4.24-1.41-1.41 2.12-2.12 1.41 1.41 2.12-2.12a1 1 0 0 1 1.41 0l2.83 2.83z"/>
                      </svg>
                    </div>
                  )
                },
                {
                  title: "Construct a Dynasty",
                  desc: "Secure elite power-hitters and death-over specialists. Manage your ₹125 Cr purse to build a championship-winning XI.",
                  icon: (
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  )
                },
                {
                  title: "Master Analytics",
                  desc: "Analyze your squad balance using real-time power ratings. Refine your lineup to dominate the standings and secure the trophy.",
                  icon: (
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 text-white shadow-lg shadow-lime-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  )
                }
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ 
                    type: "tween",
                    ease: "linear",
                    duration: 0.3,
                    delay: (i % 3) * 0.05 
                  }}
                  className="rounded-3xl border border-white/5 bg-slate-900/40 p-8 shadow-xl relative group overflow-hidden backdrop-blur-md"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="mb-6 inline-flex p-3 rounded-2xl bg-white/5 border border-white/5 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-black text-white mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-200 transition-colors">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Pro Tips Section */}
            <div className="mt-12 mb-16 px-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                <h3 className="text-3xl font-bold text-white uppercase tracking-wider flex items-center justify-center gap-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-cyan-400">Pro</span> Playbook & <span className="text-cyan-400">Strategic</span> Edge
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Purse Preservation",
                    desc: "Reserve ₹15-20 Cr for late-round gems. Championship squads are finalized in the final 5 slots.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )
                  },
                  {
                    title: "Bait & Drain",
                    desc: "Drive up the price of players rivals need to drain their purse, clearing your path for top-tier targets.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )
                  },
                  {
                    title: "The Power Ratio",
                    desc: "Prioritize multi-dimensional players (All-rounders) to maximize your 'Power Rating' without overspending.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )
                  },
                  {
                    title: "Bid Increment Tactics",
                    desc: "Counter-bid instantly to rattle opponents. Strategic speed often prevents rivals from recalculating their limit.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )
                  },
                  {
                    title: "Scout Uncapped Value",
                    desc: "Focus on domestic under-the-radar talent. They provide elite value for minimal purse impact, freeing funds for marquee stars.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Shortlist Agility",
                    desc: "Prepare your watchlist for the final accelerated round. Rapid-fire bidding requires split-second decisions to snap up gems.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )
                  }
                ].map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false, amount: 0.1 }}
                    transition={{ 
                      type: "tween",
                      ease: "linear",
                      duration: 0.3,
                      delay: (idx % 2) * 0.05 
                    }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.07] transition-all group cursor-default"
                  >
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-cyan-400 group-hover:text-cyan-300 group-hover:scale-110 transition-all">
                      {tip.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight mb-1">{tip.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed group-hover:text-white transition-colors">{tip.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Common Pitfalls Section */}
            <div className="mt-8 mb-16 px-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
                <h3 className="text-3xl font-bold text-white uppercase tracking-wider flex items-center justify-center gap-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-rose-500">Auction</span> Hazards & <span className="text-rose-500">Fatal</span> Mistakes
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: "Emotional Bidding",
                    desc: "Don't overspend on personal favorites. Ego-driven bidding ruins tactical flexibility and your purse.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Overseas Overload",
                    desc: "Only 4 overseas players can start. Don't trap major funds in expensive bench-warmers.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "The 'Opener' Trap",
                    desc: "Avoid buying 5 top-order stars. Championship squads need specialized finishers and death bowlers.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Millisecond Misses",
                    desc: "Don't wait for 0.1s to bid. Lag can end your auction hopes. Secure your players with a 1-2s cushion.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Early Purse Burn",
                    desc: "Spending 90% in the first hour is fatal. Great value 'sleeper' gems always appear in the second half.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Minimum Squad Fail",
                    desc: "Always remember the 18-player minimum. Don't run out of funds before your bench is full.",
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )
                  }
                ].map((pitfall, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false, amount: 0.1 }}
                    transition={{ 
                      type: "tween",
                      ease: "linear",
                      duration: 0.3,
                      delay: (idx % 3) * 0.05 
                    }}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all group cursor-default"
                  >
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-rose-500 group-hover:scale-110 transition-transform">
                      {pitfall.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight mb-1">{pitfall.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed group-hover:text-white transition-colors">{pitfall.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

        )}
      </AnimatePresence>
      
      <PremiumCTA />

      {/* Rules Modals */}
      <AnimatePresence>
        {showMegaRulesModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowMegaRulesModal(false);
                setPendingAction(null);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-[2.5rem] border border-cyan-500/20 bg-slate-900 shadow-2xl flex flex-col"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowMegaRulesModal(false);
                  setPendingAction(null);
                }
              }}
              tabIndex={-1}
            >
              <div className="p-8 pb-4 text-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center justify-center gap-4">
                  <span className="flex-shrink-0">
                    <svg width="45" height="45" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                      {/* Tilted Gavel (Striking Position) */}
                      <g transform="rotate(-30, 20, 36)">
                        {/* Gavel Handle */}
                        <path d="M20 15L20 36" stroke="url(#gavel_handle_grad)" strokeWidth="5" strokeLinecap="round" />
                        
                        {/* Gavel Head */}
                        <rect x="10" y="5" width="20" height="12" rx="2" fill="url(#gavel_head_grad)" />
                        <rect x="24" y="5" width="4" height="12" fill="url(#gavel_gold_grad)" />
                        <rect x="12" y="5" width="4" height="12" fill="url(#gavel_gold_grad)" />
                      </g>
                      
                      <defs>
                        <linearGradient id="gavel_head_grad" x1="10" y1="8" x2="30" y2="20" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#78350F" />
                          <stop offset="1" stopColor="#451A03" />
                        </linearGradient>
                        <linearGradient id="gavel_gold_grad" x1="0" y1="0" x2="0" y2="1">
                          <stop stopColor="#FDE047" />
                          <stop offset="1" stopColor="#A16207" />
                        </linearGradient>
                        <linearGradient id="gavel_handle_grad" x1="20" y1="20" x2="20" y2="34" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#92400E" />
                          <stop offset="1" stopColor="#451A03" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  Mega Auction Rules
                </h2>
                <div className="mt-2 h-1 w-20 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full" />
                <p className="mt-3 text-[0.7rem] font-medium text-slate-400 uppercase tracking-widest text-center">
                  Read carefully before entering the live auction room
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                <div className="space-y-6 text-slate-300">
                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                         <circle cx="12" cy="12" r="10" fill="url(#info_grad)" />
                         <path d="M12 16V12M12 8H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                         <defs>
                           <linearGradient id="info_grad" x1="2" y1="2" x2="22" y2="22">
                             <stop stopColor="#22D3EE" />
                             <stop offset="1" stopColor="#0891B2" />
                           </linearGradient>
                         </defs>
                       </svg>
                       General
                    </p>
                    <p className="text-sm border-l-2 border-slate-700 pl-3">Player pool consists of 376 players in 8 sets</p>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#purse_grad)" />
                        <defs>
                          <linearGradient id="purse_grad" x1="2" y1="2" x2="22" y2="22">
                            <stop stopColor="#FACC15" />
                            <stop offset="1" stopColor="#A16207" />
                          </linearGradient>
                        </defs>
                      </svg>
                      Auction Purse
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>Each team starts with a ₹125 Cr purse</li>
                      <li>Purse decreases after every successful bid</li>
                      <li>Team cannot bid above remaining purse</li>
                    </ul>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                         <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2522 22.1614 16.5523C21.6184 15.8524 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="url(#squad_grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                         <defs>
                           <linearGradient id="squad_grad" x1="1" y1="3" x2="23" y2="21">
                             <stop stopColor="#C084FC" />
                             <stop offset="1" stopColor="#7E22CE" />
                           </linearGradient>
                         </defs>
                       </svg>
                       Squad Size Rules
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>Minimum squad size: 18 players</li>
                      <li>Maximum squad size: 25 players</li>
                      <li>Maximum overseas players in squad: 8</li>
                    </ul>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                         <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#bolt_grad)" stroke="white" strokeWidth="0.5" />
                         <defs>
                           <linearGradient id="bolt_grad" x1="3" y1="2" x2="21" y2="22">
                             <stop stopColor="#FBBF24" />
                             <stop offset="1" stopColor="#D97706" />
                           </linearGradient>
                         </defs>
                       </svg>
                       Bid Increment Rules
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>₹10L → up to ₹2 Cr</li>
                      <li>₹20L → ₹2–5 Cr</li>
                      <li>₹25L → above ₹5 Cr</li>
                    </ul>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                         <path d="M13 19L22 12L13 5V19Z" fill="url(#speed_grad)" />
                         <path d="M2 19L11 12L2 5V19Z" fill="url(#speed_grad)" />
                         <defs>
                           <linearGradient id="speed_grad" x1="2" y1="5" x2="22" y2="19">
                             <stop stopColor="#22D3EE" />
                             <stop offset="1" stopColor="#0891B2" />
                           </linearGradient>
                         </defs>
                       </svg>
                       Accelerated Round Rules
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>Unsold players move to accelerated round</li>
                      <li>Teams can directly bid on shortlisted players</li>
                      <li>Faster auction flow</li>
                    </ul>
                  </section>
                </div>
              </div>

              <div className="p-8 pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMegaRulesModal(false);
                    if (pendingAction) pendingAction();
                    setPendingAction(null);
                  }}
                  className="flex-1 rounded-2xl bg-glow py-4 font-black uppercase tracking-wider text-white transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                >
                  Continue to Auction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMegaRulesModal(false);
                    setPendingAction(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 py-4 px-8 font-bold text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showMiniRulesModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowMiniRulesModal(false);
                setPendingAction(null);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-[2.5rem] border border-cyan-500/20 bg-slate-900 shadow-2xl flex flex-col"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowMiniRulesModal(false);
                  setPendingAction(null);
                }
              }}
              tabIndex={-1}
            >
              <div className="p-8 pb-4 text-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center justify-center gap-4">
                  <span className="flex-shrink-0">
                    <svg width="45" height="45" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                      <g transform="rotate(-30, 20, 36)">
                        <path d="M20 15L20 36" stroke="url(#mini_gavel_handle_grad)" strokeWidth="5" strokeLinecap="round" />
                        <rect x="10" y="5" width="20" height="12" rx="2" fill="url(#mini_gavel_head_grad)" />
                        <rect x="24" y="5" width="4" height="12" fill="url(#mini_gavel_gold_grad)" />
                        <rect x="12" y="5" width="4" height="12" fill="url(#mini_gavel_gold_grad)" />
                      </g>
                      <defs>
                        <linearGradient id="mini_gavel_head_grad" x1="10" y1="8" x2="30" y2="20" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#78350F" />
                          <stop offset="1" stopColor="#451A03" />
                        </linearGradient>
                        <linearGradient id="mini_gavel_gold_grad" x1="0" y1="0" x2="0" y2="1">
                          <stop stopColor="#FDE047" />
                          <stop offset="1" stopColor="#A16207" />
                        </linearGradient>
                        <linearGradient id="mini_gavel_handle_grad" x1="20" y1="20" x2="20" y2="34" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#92400E" />
                          <stop offset="1" stopColor="#451A03" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  Mini Auction Rules
                </h2>
                <div className="mt-2 h-1 w-20 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto rounded-full" />
                <p className="mt-3 text-[0.7rem] font-medium text-slate-400 uppercase tracking-widest text-center">
                  Please review the rules before entering the live auction room
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                <div className="space-y-6 text-slate-300">
                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                         <circle cx="12" cy="12" r="10" fill="url(#mini_info_grad)" />
                         <path d="M12 16V12M12 8H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                         <defs>
                           <linearGradient id="mini_info_grad" x1="2" y1="2" x2="22" y2="22">
                             <stop stopColor="#22D3EE" />
                             <stop offset="1" stopColor="#0891B2" />
                           </linearGradient>
                         </defs>
                       </svg>
                       General
                    </p>
                    <p className="text-sm border-l-2 border-slate-700 pl-3">Player pool consists of 206 players in 8 sets</p>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#mini_purse_grad)" />
                        <defs>
                          <linearGradient id="mini_purse_grad" x1="2" y1="2" x2="22" y2="22">
                            <stop stopColor="#FACC15" />
                            <stop offset="1" stopColor="#A16207" />
                          </linearGradient>
                        </defs>
                      </svg>
                      Auction Purse
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>Each franchise gets a remaining purse after retentions and releases</li>
                      <li>Teams cannot bid beyond their available purse</li>
                      <li>Purse decreases after every successful bid</li>
                    </ul>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                         <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2522 22.1614 16.5523C21.6184 15.8524 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="url(#mini_squad_grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                         <defs>
                           <linearGradient id="mini_squad_grad" x1="1" y1="3" x2="23" y2="21">
                             <stop stopColor="#C084FC" />
                             <stop offset="1" stopColor="#7E22CE" />
                           </linearGradient>
                         </defs>
                       </svg>
                       Squad Size Rules
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>Minimum squad size: 18 players</li>
                      <li>Maximum squad size: 25 players</li>
                      <li>Maximum overseas players in squad: 8</li>
                    </ul>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                         <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="url(#mini_bolt_grad)" stroke="white" strokeWidth="0.5" />
                         <defs>
                           <linearGradient id="mini_bolt_grad" x1="3" y1="2" x2="21" y2="22">
                             <stop stopColor="#FBBF24" />
                             <stop offset="1" stopColor="#D97706" />
                           </linearGradient>
                         </defs>
                       </svg>
                       Bid Increment Rules
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>₹10L → up to ₹2 Cr</li>
                      <li>₹20L → ₹2–5 Cr</li>
                      <li>₹25L → above ₹5 Cr</li>
                    </ul>
                  </section>

                  <section>
                    <p className="font-bold text-cyan-300 uppercase tracking-widest text-[0.65rem] mb-2 flex items-center gap-2">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                         <path d="M13 19L22 12L13 5V19Z" fill="url(#mini_speed_grad)" />
                         <path d="M2 19L11 12L2 5V19Z" fill="url(#mini_speed_grad)" />
                         <defs>
                           <linearGradient id="mini_speed_grad" x1="2" y1="5" x2="22" y2="19">
                             <stop stopColor="#22D3EE" />
                             <stop offset="1" stopColor="#0891B2" />
                           </linearGradient>
                         </defs>
                       </svg>
                       Accelerated Round Rules
                    </p>
                    <ul className="text-sm space-y-1 border-l-2 border-slate-700 pl-3">
                      <li>Unsold players move to accelerated round</li>
                      <li>Teams can directly bid on shortlisted players</li>
                      <li>Faster auction flow</li>
                      <li>Used to complete remaining squad slots</li>
                    </ul>
                  </section>
                </div>
              </div>

              <div className="p-8 pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMiniRulesModal(false);
                    if (pendingAction) pendingAction();
                    setPendingAction(null);
                  }}
                  className="flex-1 rounded-2xl bg-glow py-4 font-black uppercase tracking-wider text-white transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                >
                  Continue to Auction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMiniRulesModal(false);
                    setPendingAction(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 py-4 px-8 font-bold text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FeedbackSection />

      {/* Signature Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-[999] pointer-events-none flex justify-center pb-6 pt-10 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent">
        <div className="px-6 py-2 rounded-full border border-white/5 bg-slate-950/60 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-auto group hover:border-cyan-500/50 transition-all duration-500 hover:scale-105 active:scale-95">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500/80 group-hover:text-cyan-400 transition-colors text-center" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
            Made by <span className="text-slate-400 group-hover:text-white transition-colors duration-500">SB & Team</span>
          </p>
        </div>
      </div>
    </main>
  );
}

export default LobbyPage;
