const {
  createRoom,
  getRoom,
  removeRoom,
  joinRoom,
  leaveRoom,
  serializeRoom,
  isFranchiseFull,
  kickUser,
  getAllPublicRooms,
  getPublicRoomsCount,
  changeTeam,
  ALL_IPL_TEAMS,
  saveRoom,
} = require("../controllers/roomController");
const { loadAuctionSetsForStart, shuffleArray } = require("../controllers/playerDatasetController");
const { rateMultipleTeams } = require("../services/teamRatingService");

const activeSocketRooms = new Map();
const roomDelayTimers = new Map();
const roomBidTimers = new Map();
const roomSetIntroTimers = new Map();
const AUCTION_DELAY_MS = 2000;
// Keep SOLD result visible until client-side confetti lock finishes,
// so next player's timer starts at the full configured value.
const SOLD_RESULT_DELAY_MS = 3700;
const SET_INTRO_DELAY_MS = 3000;
const ACCELERATED_UNSOLD_DELAY_MS = 2000;
const DEFAULT_BID_TIMER_SECONDS = 10;
const BID_INCREMENT = 0.25;
const MIN_TEAM_PLAYERS = 18;
const MAX_TEAM_PLAYERS = 25;
const MAX_TEAM_OVERSEAS = 8;
const BID_RATE_LIMIT_MS = 750; // per user rate limit
const ALLOWED_TIMER_VALUES = new Set([5, 10]);
const ALLOWED_ACCELERATED_VALUES = new Set([2, 3, 5]);
const CHAT_RATE_LIMIT_MS = 10;
const MAX_CHAT_MESSAGE_LENGTH = 250;
const MAX_CHAT_HISTORY = 500;
const lastChatAtByUser = new Map();
const lastBidAtByUser = new Map();

// Distributed Timer Config
const TIMER_TICK_INTERVAL_MS = 1000;
const ACTIVE_ROOMS_REDIS_KEY = "ipl_active_timer_rooms";

/**
 * Distributed Timer Heartbeat
 * Runs on every instance, but only one instance ticks a specific room's timer
 * per second using a Redis lock.
 */
let timerHeartbeat = null;
const startTimerHeartbeat = (io) => {
  if (timerHeartbeat) return;
  timerHeartbeat = setInterval(async () => {
    if (!io || !saveRoom) return;

    try {
      const activeRoomIds = await redisClient.smembers(ACTIVE_ROOMS_REDIS_KEY);
      for (const roomId of activeRoomIds) {
        const timestamp = Math.floor(Date.now() / 1000);
        const lockKey = `ipl_timer_lock:${roomId}:${timestamp}`;
        
        // Try to acquire tick lock for this second
        const acquired = await redisClient.set(lockKey, "1", "EX", 2, "NX");
        if (acquired) {
          await processRoomTick(io, roomId);
        }
      }
    } catch (err) {
      console.error("[TIMER_HEARTBEAT] Error:", err);
    }
  }, TIMER_TICK_INTERVAL_MS);
};

const processRoomTick = async (io, roomId) => {
  const room = await getRoom(roomId);
  if (!room || room.auctionState.status !== "RUNNING" || room.auctionState.auctionPaused) {
    if (room && (room.auctionState.status !== "RUNNING" || room.auctionState.auctionPaused)) {
      await redisClient.srem(ACTIVE_ROOMS_REDIS_KEY, roomId);
    }
    return;
  }

  const auctionState = room.auctionState;
  if (auctionState.timerSeconds > 0) {
    auctionState.timerSeconds -= 1;
    await saveRoom(room);
    emitTimerUpdate({ io, roomId, room });
  } else {
    // Timer reached zero: process Sold/Unsold
    await redisClient.srem(ACTIVE_ROOMS_REDIS_KEY, roomId);
    await closeCurrentPlayer({ io, roomId });
  }
};

const appendChatHistory = (room, payload) => {
  if (!room || !payload) return;
  if (!Array.isArray(room.chatHistory)) {
    room.chatHistory = [];
  }
  room.chatHistory.push(payload);
  if (room.chatHistory.length > MAX_CHAT_HISTORY) {
    room.chatHistory = room.chatHistory.slice(-MAX_CHAT_HISTORY);
  }
};

function getBidIncrement(currentBid) {
  // `currentBid` is in Crore values (e.g. 2, 2.5, 3)
  // Stall: 0.10cr up to 2 cr, then 0.20cr up to 5 cr, else 0.25cr.
  if (currentBid < 2) return 0.1;
  if (currentBid < 5) return 0.2;
  return 0.25;
}

function canPlaceBid(team, player, bidAmount) {
  if (bidAmount > team.purseRemaining) {
    return { allowed: false, reason: "NOT_ENOUGH_MONEY" };
  }

  if (team.totalPlayers >= MAX_TEAM_PLAYERS) {
    return { allowed: false, reason: "MAX_PLAYERS_REACHED" };
  }

  if (player.country && player.country !== "India" && team.overseasCount >= MAX_TEAM_OVERSEAS) {
    return { allowed: false, reason: "MAX_OVERSEAS_REACHED" };
  }

  return { allowed: true };
}

function getAllPlayers(room) {
  return Array.isArray(room?.auctionState?.allPlayers) ? room.auctionState.allPlayers : [];
}

function getPlayersBySet(room, setName) {
  if (!setName) return [];
  return getAllPlayers(room).filter((p) => p.set === setName);
}

function getSetCount(room, setName) {
  return getPlayersBySet(room, setName).length;
}

function getUnsoldPlayers(room, includeAccelerated = false) {
  // Only return players with 'UNSOLD' status. 'UNSOLD_FINAL' are included only if includeAccelerated is true (for UI).
  return getAllPlayers(room).filter((p) => {
    if (p.status === "UNSOLD") return true;
    if (includeAccelerated) {
      if (p.status === "UNSOLD_FINAL") return true;
      // Include active players in the accelerated round so they stay in the unsold pool UI
      return (p.status === "PENDING" || p.status === "RUNNING") && (p.set === "Accelerated Round" || p.isAcceleratedPending);
    }
    return false;
  }).sort((a, b) => (a.unsoldAt || 0) - (b.unsoldAt || 0));
}

function getTeamsBelowMinPlayers(room) {
  if (!room || !room.teamsSelected || !room.teamState) return [];
  return room.teamsSelected.filter((teamId) => {
    const team = room.teamState[teamId];
    return !team || (team.totalPlayers || 0) < MIN_TEAM_PLAYERS;
  });
}

async function enforceMinPlayersOnAuctionEnd({ io, roomId, room }) {
  const underfilledTeamIds = getTeamsBelowMinPlayers(room);
  if (underfilledTeamIds.length === 0) {
    return false;
  }

  const unsoldPlayers = getUnsoldPlayers(room);
  if (unsoldPlayers.length > 0) {
    const maxSetNumber = room.auctionState.sets.reduce(
      (max, set) => Math.max(max, set.setNumber || 0),
      0
    );

    const reauctionSet = {
      setNumber: maxSetNumber + 1,
      setName: `Unsold Pool Reauction ${room.auctionState.reauctionRound + 1}`,
      players: unsoldPlayers,
      totalPlayers: unsoldPlayers.length,
      isReauction: true,
    };

    room.auctionState.reauctionRound += 1;
    room.auctionState.sets.push(reauctionSet);
    room.auctionState.unsoldPlayersPool = [];
    room.auctionState.status = "RUNNING";
    room.auctionState.currentSet = reauctionSet;
    room.auctionState.playerIndex = 0;
    room.auctionState.highestBid = null;
    room.auctionState.highestBidder = null;
    room.auctionState.timerSeconds = getActiveTimerSeconds(room.auctionState);

    await saveRoom(room);
    await emitSetsUpdate({ io, roomId, room });
    await emitUnsoldPoolUpdate({ io, roomId, room });
    await emitTeamUpdate({ io, roomId });

    io.to(roomId).emit("auctionMessage", {
      roomId,
      message: "Underfilled teams exist; re-auctioning unsold players to satisfy 18-player minimum",
      type: "info",
    });

    await startBidTimer({ io, roomId });
    await moveToNextPlayer({ io, roomId });

    return true;
  }

  io.to(roomId).emit("auctionFinished", {
    roomId,
    message: "Auction complete but some teams did not reach minimum 18 players",
    underfilledTeams: underfilledTeamIds,
  });

  await emitAuctionEnded({
    io,
    roomId,
    room,
    message: "Auction complete with underfilled teams",
    reason: "underfilled",
  });

  return true;
}


const buildUserPayload = ({ socket, userId, name, team, roomId, spectator }) => ({
  userId: (userId || "").trim() || socket.id,
  socketId: socket.id,
  name: (name || "").trim(),
  team: (team || "").trim(),
  teamName: (team || "").trim(),
  roomId,
  joinedAt: Date.now(),
  isSpectator: Boolean(spectator),
});

const buildSystemRoomId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const emitPublicRoomCount = async (io) => {
  const count = await getPublicRoomsCount();
  io.emit("publicRoomCount", { count });
};

const emitTeamUpdate = async ({ io, roomId }) => {
  const room = await getRoom(roomId);
  if (!room) return;

  console.log(`[EMIT_TU] Sending room state: bid=${room.auctionState.highestBid}, bidder=${room.auctionState.highestBidder}`);
  
  // Just send the actual room state - don't sanitize
  io.to(roomId).emit("teamUpdate", serializeRoom(room));
};

const emitAuctionChat = async ({ io, roomId, message, auctionEvent }) => {
  const payload = {
    roomId,
    username: "Auction",
    team: "",
    message,
    sentAt: Date.now(),
    isSystem: true,
    auctionEvent: auctionEvent || null,
  };
  const room = await getRoom(roomId);
  if (room) {
    appendChatHistory(room, payload);
    await saveRoom(room);
  }
  io.to(roomId).emit("chatMessage", payload);
};

const emitAuctionEnded = async ({ io, roomId, room, message, reason }) => {
  const allTeamsSnapshot = ALL_IPL_TEAMS.map((teamId) => {
    const team = room?.teamState?.[teamId] || {};
    return {
      name: teamId,
      players: Array.isArray(team.players) ? team.players : [],
    };
  });

  const teamRatings = rateMultipleTeams(allTeamsSnapshot);

  if (room?.auctionState) {
    room.auctionState.status = "ENDED";
    room.auctionState.auctionEnded = true;
    room.auctionState.auctionPaused = true;
    room.auctionState.currentSet = null;
    room.auctionState.currentPlayer = null;
    room.auctionState.highestBid = null;
    room.auctionState.highestBidder = null;
    room.auctionState.timerSeconds = 0;
    room.auctionState.endMessage = message || "Auction ended";
    room.auctionState.endReason = reason || "finished";
    room.auctionState.teamRatings = teamRatings;
  }

  const payload = {
    roomId,
    message: message || "Auction ended",
    reason: reason || "finished",
    teamState: room?.teamState || {},
    teamRatings,
    unsoldPlayersPool: room?.auctionState?.unsoldPlayersPool || [],
  };
  io.to(roomId).emit("auctionEnded", payload);
  io.to(roomId).emit("auctionEnd", payload);
  await saveRoom(room);
  await emitTeamUpdate({ io, roomId });
  await emitPublicRoomCount(io);

  // Expire room code once auction ends so old/invalid joins cannot revive it.
  clearSetIntroTimer(roomId);
  await clearBidTimer(roomId);
  clearRoomTimer(roomId);
};

const maybeAfterJoinEffects = (io, roomId) => {
  // Auto-Auction start countdown has been disabled to ensure manual control by the host.
};

/**
 * Shared auction bootstrap (strict dataset, then relaxed fallback).
 * Host can start with any number of human players in the room; player list size is not enforced.
 */
const startAuctionCore = async ({ io, roomId, timerSeconds, accelerated, acceleratedTimerSeconds }) => {
  const room = await getRoom(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  clearSetIntroTimer(roomId);

  // Room set order and stable base data
  // Only load if not already pre-loaded (fallback)
  if (!room.auctionState.sets || room.auctionState.sets.length === 0) {
    const dataset = loadAuctionSetsForStart({ auctionType: room.auctionType || 'mega' });
    const marqueeSet = dataset.sets.find((set) => set.setName === "Marquee Players");
    const orderedSets = marqueeSet
      ? [marqueeSet, ...dataset.sets.filter((set) => set.setName !== "Marquee Players")]
      : [...dataset.sets];

    room.auctionState.sets = orderedSets;
    room.auctionState.allPlayers = orderedSets
      .filter((set) => set.setName !== "Unsold Players")
      .flatMap((set) =>
        set.players.map((player) => ({
          ...player,
          status: player.status || "PENDING",
        }))
      );
    // Even in fallback, provide a different shuffle for display
    room.auctionState.allPlayers = shuffleArray(room.auctionState.allPlayers);

    // Initialize pickedPlayerIds for each set
    room.auctionState.sets.forEach((set) => {
      if (!set.pickedPlayerIds) {
        set.pickedPlayerIds = new Set();
      }
    });
  }

  // Save current Host configuration for the session
  room.auctionState.timerConfigSeconds = timerSeconds || DEFAULT_BID_TIMER_SECONDS;
  room.auctionState.accelerated = Boolean(accelerated);
  room.auctionState.acceleratedGlobal = Boolean(accelerated);
  room.auctionState.acceleratedTimerSeconds = acceleratedTimerSeconds || 3;

  // Explicitly start from Marquee Players set
  room.auctionState.setIndex = 0;
  room.auctionState.playerIndex = 0;
  room.auctionState.currentSet = null;
  room.auctionState.currentPlayer = null;
  room.auctionState.highestBid = null;
  room.auctionState.highestBidder = null;
  room.auctionState.status = "WAITING";
  room.auctionState.timerSeconds = 0;
  room.auctionState.roundId = 0;
  // Reset acceleration map entirely to prevent stale accelerated set entries
  room.auctionState.acceleratedSetMap = {};
  room.auctionState.unsoldPlayersPool = [];
  room.auctionState.selectedUnsoldPlayerIds = [];
  room.auctionState.reauctionRound = 0;
  room.auctionState.lastSetIntroName = null;
  room.auctionState.autoStartSecondsRemaining = null;
  room.auctionState.auctionPaused = false;
  room.auctionState.nextPlayerPreviewKey = null;
  room.auctionState.nextPlayerPreviewName = "";

  await saveRoom(room);
  await moveToNextPlayer({ io, roomId });
};

const toPrice = (value) => Math.round(value * 100) / 100;

const startBidTimer = async ({ io, roomId, reset, preCalculatedTimer }) => {
  const room = await getRoom(roomId);
  if (!room) return;

  if (reset) {
    room.auctionState.timerSeconds = preCalculatedTimer || getActiveTimerSeconds(room.auctionState);
  }

  await saveRoom(room);
  await redisClient.sadd(ACTIVE_ROOMS_REDIS_KEY, roomId);
  emitTimerUpdate({ io, roomId, room });
};

const clearBidTimer = async (roomId) => {
  await redisClient.srem(ACTIVE_ROOMS_REDIS_KEY, roomId);
};

const emitTimerUpdate = ({ io, roomId, room }) => {
  // CRITICAL: Never emit timer updates while in DELAY state (during unsold/sold delay)
  // This ensures the old timer doesn't bleed into the new player's timer
  if (room.auctionState.status === "DELAY") {
    return;
  }
  const payload = {
    roomId,
    status: room.auctionState.status,
    roundId: Number(room.auctionState.roundId || 0),
    timerSeconds: room.auctionState.timerSeconds,
    timerConfigSeconds: room.auctionState.timerConfigSeconds,
    accelerated: room.auctionState.accelerated,
    acceleratedTimerSeconds: room.auctionState.acceleratedTimerSeconds,
    acceleratedGlobal: room.auctionState.acceleratedGlobal,
    acceleratedSetMap: room.auctionState.acceleratedSetMap,
    auctionPaused: Boolean(room.auctionState.auctionPaused),
  };
  io.to(roomId).emit("timerUpdate", payload);
  io.to(roomId).emit("timer", payload);
};

const isAcceleratedActiveForCurrentSet = (auctionState) => {
  const currentSetNumber = auctionState.currentSet?.setNumber;
  if (
    Number.isInteger(currentSetNumber) &&
    auctionState.acceleratedSetMap[currentSetNumber] === true
  ) {
    return true;
  }

  return Boolean(auctionState.acceleratedGlobal || auctionState.accelerated);
};

const getActiveTimerSeconds = (auctionState) => {
  const currentSetNumber = auctionState.currentSet?.setNumber;
  const acceleratedSetFlag = Number.isInteger(currentSetNumber) ? auctionState.acceleratedSetMap[currentSetNumber] : null;
  const isAccelerated = isAcceleratedActiveForCurrentSet(auctionState);
  const configSeconds = auctionState.timerConfigSeconds || DEFAULT_BID_TIMER_SECONDS;
  const acceleratedSeconds = auctionState.acceleratedTimerSeconds || 3;
  const result = isAccelerated ? acceleratedSeconds : configSeconds;
  
  return result;
};

const clearRoomTimer = (roomId) => {
  const timerId = roomDelayTimers.get(roomId);
  if (timerId) {
    clearTimeout(timerId);
    roomDelayTimers.delete(roomId);
  }
};

const clearSetIntroTimer = (roomId) => {
  const timerId = roomSetIntroTimers.get(roomId);
  if (timerId) {
    clearTimeout(timerId);
    roomSetIntroTimers.delete(roomId);
  }
};

const getCurrentSet = (room) => room.auctionState.sets[room.auctionState.setIndex] || null;
const playerKey = (player) => String(player?.id ?? player?.name ?? "");
const getUserBySocket = (room, socketId) =>
  room?.users.find((user) => user.socketId === socketId);
const isAdminSocket = (room, socketId) => {
  const user = getUserBySocket(room, socketId);
  return Boolean(user && room?.adminUserId === user.userId);
};

const emitUnsoldPoolUpdate = ({ io, roomId, room }) => {
  const allPlayers = Array.isArray(room.auctionState.allPlayers) ? room.auctionState.allPlayers : [];
  // Include both UNSOLD and UNSOLD_FINAL (accelerated) for the UI pool
  const unsoldPlayersPool = allPlayers.filter((player) => 
    player.status === "UNSOLD" || player.status === "UNSOLD_FINAL"
  ).sort((a, b) => (a.unsoldAt || 0) - (b.unsoldAt || 0));

  room.auctionState.unsoldPlayersPool = unsoldPlayersPool;

  io.to(roomId).emit("unsoldPoolUpdate", {
    roomId,
    unsoldPlayersPool,
    selectedUnsoldPlayerIds: room.auctionState.selectedUnsoldPlayerIds,
  });
};

const buildSetsSnapshot = (room) => {
  const auctionState = room.auctionState;
  const allPlayers = getAllPlayers(room);
  const unsoldPlayers = getUnsoldPlayers(room, true); // Include accelerated players for UI pool

  let setNames = (auctionState.sets || [])
    .filter(set => !set.isAccelerated && set.setName !== "Accelerated Round")
    .map((set) => set.setName);

  if (!setNames.includes("Unsold Players")) {
    setNames.push("Unsold Players");
  }

  return setNames.map((setName) => {
    const isUnsold = setName === "Unsold Players";
    
    // Players belonging to this set (original or current)
    const playersInOriginalSet = isUnsold
      ? unsoldPlayers
      : allPlayers.filter((player) => {
          // If a player is UNSOLD or UNSOLD_FINAL, they "moved" to the "Unsold Players" category.
          if (player.status === "UNSOLD" || player.status === "UNSOLD_FINAL") return false;
          // If player is in Accelerated Round re-auctioning (PENDING/RUNNING), 
          // hide them from original set so counts don't jump during the draft.
          if ((player.status === "PENDING" || player.status === "RUNNING") && (player.set === "Accelerated Round" || player.isAcceleratedPending)) return false;
          return (player.originalSet || player.set) === setName;
        });

    // For the UI set list, we show the current players in this category (excluding moved Unsold players).
    const setPlayers = playersInOriginalSet;

    const soldCount = isUnsold
      ? 0
      : playersInOriginalSet.filter((player) => player.status === "SOLD").length;

    const unsoldCount = isUnsold
      ? playersInOriginalSet.length
      : playersInOriginalSet.filter((player) => player.status === "UNSOLD" || player.status === "UNSOLD_FINAL").length;

    const originalCount = (auctionState.sets || []).find((set) => set.setName === setName)?.originalTotalPlayers ?? setPlayers.length;

    return {
      setName,
      players: setPlayers,
      totalPlayers: setPlayers.length, // Reflect current pool count (e.g. 26/27)
      soldCount,
      unsoldCount,
      originalTotalPlayers: originalCount,
    };
  });
};

const emitSetsUpdate = ({ io, roomId, room }) => {
  const setsWithPlayers = buildSetsSnapshot(room);
  const unsoldPlayersPool = getUnsoldPlayers(room, true);

  console.log(`DEBUG Marquee Count: ${getSetCount(room, "Marquee Players")}`);
  console.log(
    `[SETS] ${setsWithPlayers.map((s) => `${s.setName}=${s.totalPlayers}(orig=${s.originalTotalPlayers})`).join(", ")}`
  );

  room.auctionState.unsoldPlayersPool = unsoldPlayersPool;

  io.to(roomId).emit("setsUpdate", {
    roomId,
    sets: setsWithPlayers,
  });
};

const emitNewPlayer = ({ io, roomId, room }) => {
  const auctionState = room.auctionState;
  const player = auctionState.currentPlayer;
  
  const payload = {
    roomId,
    status: auctionState.status,
    roundId: Number(auctionState.roundId || 0),
    currentSet: auctionState.currentSet,
    currentPlayer: player,
    highestBid: auctionState.highestBid,
    highestBidder: auctionState.highestBidder,
    timerSeconds: Number(auctionState.timerSeconds ?? 0),
  };
  if (!player) {
    console.error(`[EMIT] ERROR: currentPlayer is null! auctionState keys: ${Object.keys(auctionState).join(', ')}`);
  }
  io.to(roomId).emit("newPlayer", payload);
  io.to(roomId).emit("playerChange", {
    ...payload,
    nextPlayerName: auctionState.nextPlayerPreviewName || "",
    nextPlayerKey: auctionState.nextPlayerPreviewKey || null,
    nextPlayerText: auctionState.nextPlayerPreviewName
      ? `Next Player: ${auctionState.nextPlayerPreviewName}`
      : "",
  });
};

const moveToNextPlayer = async ({ io, roomId }) => {
  const room = await getRoom(roomId);
  if (!room) {
    console.log(`[AUCTION] moveToNextPlayer: room not found`);
    return;
  }

  const auctionState = room.auctionState;
  const currentSet = auctionState.sets[auctionState.setIndex];
  console.log(`[AUCTION] moveToNextPlayer: setIndex=${auctionState.setIndex}, currentSet=${currentSet?.setName}`);

  if (!currentSet) {
    console.log(`[AUCTION] No more sets`);
    await clearBidTimer(roomId);

    if (auctionState.accelerated) {
      auctionState.status = "WAITING";
      auctionState.currentSet = null;
      auctionState.currentPlayer = null;
      auctionState.highestBid = null;
      auctionState.highestBidder = null;
      auctionState.nextPlayerPreviewKey = null;
      auctionState.nextPlayerPreviewName = "";
      auctionState.acceleratedComplete = true;
      auctionState.statusMessage = "Accelerated Round Completed";
      io.to(roomId).emit("newPlayer", {
        roomId,
        status: "WAITING",
        message: "Accelerated Round Completed",
      });
      await saveRoom(room);
      await emitTeamUpdate({ io, roomId });
      return;
    }

    await emitAuctionEnded({
      io,
      roomId,
      room,
      message: "Auction finished successfully",
      reason: "complete",
    });
    return;
  }

  if (!currentSet.pickedPlayerIds) {
    currentSet.pickedPlayerIds = new Set();
  }

  if (!currentSet.__randomized && Array.isArray(currentSet.players) && currentSet.players.length > 0) {
    const shuffled = shuffleArray(currentSet.players);
    currentSet.players = shuffled;
    auctionState.sets[auctionState.setIndex].players = shuffled;
    currentSet.__randomized = true;
    console.log(`[AUCTION] Shuffled set ${currentSet.setName} (${currentSet.players.length} players)`);
  }

  const pickedIds = currentSet.pickedPlayerIds || new Set();
  const unpickedPlayers = currentSet.players.filter((p) => !pickedIds.has(playerKey(p)));

  if (unpickedPlayers.length === 0) {
    console.log(`[AUCTION] Set exhausted, moving to next`);
    auctionState.setIndex += 1;
    auctionState.playerIndex = 0;

    const nextSet = auctionState.sets[auctionState.setIndex];
    if (!nextSet) {
      console.log(`[AUCTION] No more sets`);
      await clearBidTimer(roomId);

      if (auctionState.accelerated) {
        auctionState.status = "WAITING";
        auctionState.currentSet = null;
        auctionState.currentPlayer = null;
        auctionState.highestBid = null;
        auctionState.highestBidder = null;
        auctionState.nextPlayerPreviewKey = null;
        auctionState.nextPlayerPreviewName = "";
        auctionState.acceleratedComplete = true;
        auctionState.statusMessage = "Accelerated Round Completed";
        io.to(roomId).emit("newPlayer", {
          roomId,
          status: "WAITING",
          message: "Accelerated Round Completed",
        });
        await saveRoom(room);
        await emitTeamUpdate({ io, roomId });
        return;
      }

      const ended = await enforceMinPlayersOnAuctionEnd({ io, roomId, room });
      if (ended) return;

      auctionState.status = "WAITING";
      auctionState.currentSet = null;
      auctionState.currentPlayer = null;
      auctionState.highestBid = null;
      auctionState.highestBidder = null;
      auctionState.nextPlayerPreviewKey = null;
      auctionState.nextPlayerPreviewName = "";
      io.to(roomId).emit("newPlayer", {
        roomId,
        status: "WAITING",
        message: "Auction finished",
      });
      await saveRoom(room);
      await emitTeamUpdate({ io, roomId });
      return;
    }

    if (!nextSet.pickedPlayerIds) {
      nextSet.pickedPlayerIds = new Set();
    }

    console.log(`[AUCTION] Moving to next set: ${nextSet.setName}`);
    await moveToNextPlayer({ io, roomId });
    return;
  }

  const preselectedKey = auctionState.nextPlayerPreviewKey;
  let player = null;

  if (preselectedKey) {
    player = unpickedPlayers.find((candidate) => playerKey(candidate) === preselectedKey) || null;
  }

  if (!player) {
    player = unpickedPlayers[0];
  }

  const selectedPlayerKey = playerKey(player);
  currentSet.pickedPlayerIds.add(selectedPlayerKey);
  auctionState.sets[auctionState.setIndex].pickedPlayerIds = currentSet.pickedPlayerIds;
  auctionState.playerIndex += 1;
  auctionState.currentSet = { setName: currentSet.setName };

  const remainingPlayers = unpickedPlayers.filter((candidate) => playerKey(candidate) !== selectedPlayerKey);
  if (remainingPlayers.length > 0) {
    const previewPlayer = remainingPlayers[0];
    auctionState.nextPlayerPreviewKey = playerKey(previewPlayer);
    auctionState.nextPlayerPreviewName = previewPlayer?.name || "";
  } else {
    let previewFound = false;
    for (let idx = auctionState.setIndex + 1; idx < auctionState.sets.length; idx += 1) {
      const candidateSet = auctionState.sets[idx];
      if (!candidateSet || !Array.isArray(candidateSet.players) || candidateSet.players.length === 0) continue;

      if (!candidateSet.pickedPlayerIds) {
        candidateSet.pickedPlayerIds = new Set();
      }

      const candidateUnpicked = candidateSet.players.filter((candidate) => !candidateSet.pickedPlayerIds.has(playerKey(candidate)));
      if (candidateUnpicked.length === 0) continue;

      const previewPlayer = candidateUnpicked[0];
      auctionState.nextPlayerPreviewKey = playerKey(previewPlayer);
      auctionState.nextPlayerPreviewName = previewPlayer?.name || "";
      previewFound = true;
      break;
    }

    if (!previewFound) {
      auctionState.nextPlayerPreviewKey = null;
      auctionState.nextPlayerPreviewName = "";
    }
  }

  const revealPlayerAndStart = async (activeRoom, selectedPlayer) => {
    activeRoom.auctionState.currentPlayer = selectedPlayer;
    activeRoom.auctionState.highestBid = null;
    activeRoom.auctionState.highestBidder = null;
    activeRoom.auctionState.status = "RUNNING";
    activeRoom.auctionState.roundId = Number(activeRoom.auctionState.roundId || 0) + 1;
    
    const calculatedTimer = activeRoom.auctionState.timerConfigSeconds || 10;
    activeRoom.auctionState.timerSeconds = calculatedTimer;

    await saveRoom(activeRoom);
    emitNewPlayer({ io, roomId, room: activeRoom });
    emitTimerUpdate({ io, roomId, room: activeRoom });
    await emitUnsoldPoolUpdate({ io, roomId, room: activeRoom });
    await emitSetsUpdate({ io, roomId, room: activeRoom });
    await emitTeamUpdate({ io, roomId, room: activeRoom });
    if (!activeRoom.auctionState.auctionPaused) {
      await startBidTimer({ io, roomId, reset: true, preCalculatedTimer: calculatedTimer });
    }
  };

  const enteringNewSet = auctionState.lastSetIntroName !== currentSet.setName;
  if (!enteringNewSet) {
    await revealPlayerAndStart(room, player);
    return;
  }

  auctionState.lastSetIntroName = currentSet.setName;
  io.to(roomId).emit("setIntro", {
    roomId,
    setName: currentSet.setName,
    text: `Coming Up: ${currentSet.setName}`,
    durationMs: SET_INTRO_DELAY_MS,
  });

  clearSetIntroTimer(roomId);
  auctionState.currentPlayer = null;
  auctionState.highestBid = null;
  auctionState.highestBidder = null;
  auctionState.status = "WAITING";
  auctionState.timerSeconds = 0;

  io.to(roomId).emit("newPlayer", {
    roomId,
    status: "WAITING",
    currentSet: auctionState.currentSet,
    currentPlayer: null,
    highestBid: null,
    highestBidder: null,
  });
  await saveRoom(room);
  emitTimerUpdate({ io, roomId, room });
  await emitUnsoldPoolUpdate({ io, roomId, room });
  await emitSetsUpdate({ io, roomId, room });
  await emitTeamUpdate({ io, roomId, room });

  const selectedSetName = currentSet.setName;
  const selectedPlayer = player;
  const timerId = setTimeout(async () => {
    roomSetIntroTimers.delete(roomId);
    const activeRoom = await getRoom(roomId);
    if (!activeRoom) return;
    if (activeRoom.auctionState.currentSet?.setName !== selectedSetName) return;
    await revealPlayerAndStart(activeRoom, selectedPlayer);
  }, SET_INTRO_DELAY_MS);
  roomSetIntroTimers.set(roomId, timerId);
};

const closeCurrentPlayer = ({ io, roomId }) => {
  const room = getRoom(roomId);
  if (!room || room.auctionState.status !== "RUNNING") return;


  const { currentPlayer, highestBid, highestBidder, currentSet } = room.auctionState;
  const currentSetName =
    currentSet && typeof currentSet === "object"
      ? currentSet.setName
      : currentSet;

  clearBidTimer(roomId);
  const sold = Boolean(highestBidder);
  const result = sold ? "SOLD" : "UNSOLD";
  const acceleratedActive = isAcceleratedActiveForCurrentSet(room.auctionState);
  const delayMs = sold
    ? SOLD_RESULT_DELAY_MS
    : acceleratedActive
      ? ACCELERATED_UNSOLD_DELAY_MS
      : AUCTION_DELAY_MS;

  room.auctionState.status = "DELAY";
  room.auctionState.timerSeconds = 0;
  let resolvedWinningBid = highestBid;

  if (sold && room.teamState[highestBidder]) {
    const team = room.teamState[highestBidder];
    const currentPlayerKey = playerKey(currentPlayer);
    
    // CRITICAL: Ensure we have a valid winning bid amount
    const bidValue = Number(highestBid);
    const basePrice = Number(currentPlayer.basePrice) || 0.5;
    
    // Use bidValue if it's a valid positive number, otherwise use basePrice
    const winningBidAmount = (bidValue > 0) ? bidValue : basePrice;
    const finalPrice = toPrice(winningBidAmount);
    resolvedWinningBid = finalPrice;
    
    console.log(`[SELL_PLAYER] ${currentPlayer.name}: highestBid=${highestBid}, basePrice=${currentPlayer.basePrice}, winning=${winningBidAmount}, final=${finalPrice}`);
    
    // Store with confirmed amount
    const playerWithPrice = { 
      ...currentPlayer, 
      soldTo: highestBidder,
      soldPrice: finalPrice,
      basePrice: basePrice  // Keep base price in case of reference
    };
    
    const newTeamState = {
      ...team,
      players: [...team.players, playerWithPrice],
      totalPlayers: team.totalPlayers + 1,
      overseasCount:
        team.overseasCount + (currentPlayer.country && currentPlayer.country !== "India" ? 1 : 0),
      purseRemaining: toPrice(team.purseRemaining - finalPrice),
    };
    
    room.teamState[highestBidder] = newTeamState;
    
    console.log(`[TEAM_UPDATED] ${highestBidder}: player added with soldPrice=${finalPrice}, teams players now:`, room.teamState[highestBidder].players.map(p => ({name: p.name, soldPrice: p.soldPrice})));

    const updatedPlayer = {
      ...currentPlayer,
      status: "SOLD",
      soldTo: highestBidder,
      soldPrice: finalPrice,
      isAcceleratedPending: false, // Reset flag upon sale
      // If the player was part of an Accelerated Round, restore their original set category
      set: currentPlayer.originalSet || currentPlayer.set || currentSetName,
    };

    room.auctionState.allPlayers = room.auctionState.allPlayers.map((player) =>
      playerKey(player) === currentPlayerKey ? updatedPlayer : player
    );

    room.auctionState.sets = room.auctionState.sets.map((set) => {
      if (set.setName !== currentSetName) return set;
      return {
        ...set,
        players: set.players.map((player) =>
          playerKey(player) === currentPlayerKey ? { ...player, ...updatedPlayer } : player
        ),
      };
    });
  } else if (!sold && currentPlayer) {
    const currentPlayerKey = playerKey(currentPlayer);
    const updatedPlayer = {
      ...currentPlayer,
      // If we are in an accelerated round, the player stays unsold permanently
      // If we are in a normal round, they can be re-auctioned in an accelerated round
      status: acceleratedActive ? "UNSOLD_FINAL" : "UNSOLD",
      unsoldAt: currentPlayer.unsoldAt || Date.now(), // Track exact time of going unsold
      isAcceleratedPending: false, // Reset flag upon unsold
      set: acceleratedActive ? "Unsold Players" : (currentPlayer.originalSet || currentPlayer.set || "Unsold Players"),
      originalSet: currentPlayer.originalSet || currentPlayer.set || currentSetName,
    };

    room.auctionState.allPlayers = room.auctionState.allPlayers.map((player) =>
      playerKey(player) === currentPlayerKey ? updatedPlayer : player
    );

    room.auctionState.sets = room.auctionState.sets.map((set) => {
      if (set.setName !== currentSetName) return set;
      return {
        ...set,
        players: set.players.map((player) =>
          playerKey(player) === currentPlayerKey ? { ...player, ...updatedPlayer } : player
        ),
      };
    });

    // avoid mutating arrays other than the derived computed state.
  }


  io.to(roomId).emit("playerSold", {
    roomId,
    currentSet,
    player: currentPlayer,
    sold,
    result,
    highestBid: resolvedWinningBid,
    highestBidder,
    delayMs,
  });

  const playerName = currentPlayer?.name || "Player";
  if (sold && highestBidder) {
    emitAuctionChat({
      io,
      roomId,
      message: `SOLD: ${playerName} to ${highestBidder} for ₹${resolvedWinningBid} Cr`,
      auctionEvent: { type: "sold", playerName, team: highestBidder, amount: resolvedWinningBid },
    });
  } else {
    emitAuctionChat({
      io,
      roomId,
      message: `UNSOLD: ${playerName}`,
      auctionEvent: { type: "unsold", playerName },
    });
  }

  room.auctionState.status = "DELAY";
  await saveRoom(room);
  await emitUnsoldPoolUpdate({ io, roomId, room });
  await emitSetsUpdate({ io, roomId, room });
  
  if (sold && highestBidder) {
    console.log(`[BEFORE_EMIT_TEAM] Team ${highestBidder} players added`);
  }
  
  await emitTeamUpdate({ io, roomId });

  await clearRoomTimer(roomId);
  const timerId = setTimeout(async () => {
    roomDelayTimers.delete(roomId);
    const activeRoom = await getRoom(roomId);
    if (!activeRoom) return;

    activeRoom.auctionState.status = "NEXT_PLAYER";
    await saveRoom(activeRoom);
    await moveToNextPlayer({ io, roomId });
  }, delayMs);

  roomDelayTimers.set(roomId, timerId);
};

const startAcceleratedRound = ({ io, roomId }) => {
  const room = getRoom(roomId);
  if (!room) return { ok: false, message: "Room not found" };
  if (room.auctionState.status === "ENDED") return { ok: false, message: "Auction already ended" };

  // Perfect sequence fix: iterate through sets and internal players to mirror the exact chronological auction order
  const originalSets = room.auctionState.sets.filter(s => !s.isAccelerated && s.setName !== "Accelerated Round");
  let unsoldPlayers = [];
  originalSets.forEach(set => {
    if (Array.isArray(set.players)) {
      set.players.forEach(p => {
        // Find the player in the master list to get their current status
        const globalPlayer = room.auctionState.allPlayers.find(gp => playerKey(gp) === playerKey(p));
        if (globalPlayer && globalPlayer.status === "UNSOLD") {
          unsoldPlayers.push(globalPlayer);
        }
      });
    }
  });

  // Ultimate sequence fix: Sort by the exact timestamp they went unsold
  unsoldPlayers.sort((a, b) => (a.unsoldAt || 0) - (b.unsoldAt || 0));

  if (unsoldPlayers.length === 0) {
     io.to(roomId).emit("auctionMessage", {
       roomId,
       message: "No unsold players available to start Accelerated Round",
       type: "warning",
     });
     return { ok: false, message: "No unsold players available" };
  }

  // Clear any existing timers
  clearBidTimer(roomId);
  clearRoomTimer(roomId);
  clearSetIntroTimer(roomId);

  const acceleratedPlayers = unsoldPlayers.map((p) => ({
    ...p,
    status: "PENDING",
    isAcceleratedPending: true, // Explicit flag for UI stability
    originalSet: p.originalSet || p.set, // Preserve original category
    set: "Accelerated Round",
  }));

  const playerIds = new Set(acceleratedPlayers.map(playerKey));
  room.auctionState.allPlayers = room.auctionState.allPlayers.map((p) => {
    if (playerIds.has(playerKey(p))) {
      const ap = acceleratedPlayers.find(acc => playerKey(acc) === playerKey(p));
      return ap || p;
    }
    return p;
  });

  const acceleratedSet = {
    setName: "Accelerated Round",
    players: acceleratedPlayers,
    pickedPlayerIds: new Set(),
    totalPlayers: acceleratedPlayers.length,
    isAccelerated: true
  };

  room.auctionState.sets.push(acceleratedSet);

  room.auctionState.setIndex = room.auctionState.sets.length - 1;
  room.auctionState.currentSet = acceleratedSet;
  room.auctionState.playerIndex = 0;
  room.auctionState.status = "NEXT_PLAYER";
  room.auctionState.currentPlayer = null;
  room.auctionState.auctionPaused = false;
  room.auctionState.accelerated = true; // global flag for short timers
  // Default Accelerated Round timer to 5s as per User requirement
  room.auctionState.acceleratedTimerSeconds = 5;
  room.auctionState.highestBid = null;
  room.auctionState.highestBidder = null;
  room.auctionState.nextPlayerPreviewKey = null;
  room.auctionState.nextPlayerPreviewName = "";
  
  // Set the specific state required for UI branding
  if (!room.auctionState.acceleratedRound) {
    room.auctionState.acceleratedRound = {};
  }
  room.auctionState.acceleratedRound.active = true;
  room.auctionState.acceleratedRound.started = true;
  
  emitSetsUpdate({ io, roomId, room });
  emitUnsoldPoolUpdate({ io, roomId, room });
  emitTeamUpdate({ io, roomId });

  // Broadcast the special start event for UI effects
  io.to(roomId).emit("acceleratedRoundStarted", {
    roomId,
    unsoldPlayers,
  });
  
  moveToNextPlayer({ io, roomId });
  return { ok: true };
};

const startBidTimer = ({ io, roomId, reset = false, preCalculatedTimer = null }) => {
  const room = getRoom(roomId);
  if (!room || room.auctionState.status !== "RUNNING") return;
  if (room.auctionState.auctionPaused) {
    clearBidTimer(roomId);
    emitTimerUpdate({ io, roomId, room });
    return;
  }

  clearBidTimer(roomId);
  // Use pre-calculated timer if provided, otherwise calculate now
  const timerDuration = preCalculatedTimer ?? getActiveTimerSeconds(room.auctionState);
  if (reset || room.auctionState.timerSeconds <= 0) {
    room.auctionState.timerSeconds = timerDuration;
  }

  const startTime = Date.now();
  const timerDurationAtStart = room.auctionState.timerSeconds;
  
  console.log(`[START_BID_TIMER] START roomId=${roomId}, reset=${reset}, timerDuration=${timerDuration}, timerSeconds=${room.auctionState.timerSeconds}, player=${room.auctionState.currentPlayer?.name}, t=${startTime}`);

  emitTimerUpdate({ io, roomId, room });

  const timerId = setInterval(() => {
    const activeRoom = getRoom(roomId);
    if (
      !activeRoom ||
      activeRoom.auctionState.status !== "RUNNING" ||
      activeRoom.auctionState.auctionPaused
    ) {
      clearBidTimer(roomId);
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const newTimerSeconds = Math.max(0, timerDurationAtStart - elapsedSeconds);
    
    // Only update and emit if the value has actually changed to save bandwidth
    if (activeRoom.auctionState.timerSeconds !== newTimerSeconds) {
      activeRoom.auctionState.timerSeconds = newTimerSeconds;
      emitTimerUpdate({ io, roomId, room: activeRoom });
    }

    if (activeRoom.auctionState.timerSeconds <= 0) {
      clearBidTimer(roomId);
      closeCurrentPlayer({ io, roomId });
    }
  }, 500); // Check every 500ms for smoother sync, but still emit every 1s (effectively)

  roomBidTimers.set(roomId, timerId);
};

const registerAuctionSocketHandlers = (io) => {
  // Initialize Distributed Timer Heartbeat
  startTimerHeartbeat(io);

  const wrapHandler = async (callback = async () => {}) => {
    try {
      await callback();
    } catch (error) {
      console.error("Socket handler error:", error);
    }
  };

  io.on("connection", (socket) => {
    // Send initial public room count on connection
    emitPublicRoomCount(io);

        // Handle room deletion from client (admin only)
        socket.on("deleteRoom", (payload = {}, callback = () => {}) => {
          wrapHandler(() => {
            const { roomId } = payload;
            const normalizedRoomId = (roomId || "").trim().toUpperCase();
            const room = getRoom(normalizedRoomId);
            if (!room) {
              callback({ ok: false, message: "Room not found" });
              return;
            }
            if (!isAdminSocket(room, socket.id)) {
              callback({ ok: false, message: "Only admin can delete room" });
              return;
            }
            removeRoom(normalizedRoomId);
            callback({ ok: true });
            // Optionally, emit to all clients in the room that it was deleted
            io.to(normalizedRoomId).emit("roomDeleted", { roomId: normalizedRoomId });
            emitPublicRoomCount(io);
          });
        });
    socket.emit("socket:connected", { socketId: socket.id });

    socket.on("createRoom", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const requestedId = (payload.roomId || "").trim().toUpperCase();
        const roomId = requestedId || buildSystemRoomId();
        const name = String(payload.name || "").trim();
        const team = String(payload.team || "").trim();
        const auctionType = String(payload.auctionType || "mega").toLowerCase() === "mini" ? "mini" : "mega";
        const roomVisibility = String(payload.roomVisibility || "public").toLowerCase() === "private" ? "private" : "public";

        if (!name || (!payload.spectator && !team)) {
          callback({ ok: false, message: "Name and team are required unless joining as spectator." });
          return;
        }

        const adminUser = buildUserPayload({
          socket,
          userId: payload.userId,
          name,
          team: payload.spectator ? "SPEC" : team,
          roomId,
          spectator: !!payload.spectator,
        });

        const { error, room } = await createRoom({ roomId, adminUser, auctionType, roomVisibility });
        if (error) {
          callback({ ok: false, message: error });
          return;
        }

        const dataset = loadAuctionSetsForStart({ auctionType: room.auctionType || 'mega' });
        const marqueeSet = dataset.sets.find((set) => set.setName === "Marquee Players");
        const orderedSets = marqueeSet
          ? [marqueeSet, ...dataset.sets.filter((set) => set.setName !== "Marquee Players")]
          : [...dataset.sets];

        room.auctionState.sets = orderedSets;
        room.auctionState.sets.forEach((set) => {
          if (!set.pickedPlayerIds) {
            set.pickedPlayerIds = new Set();
          }
        });

        const rawAllPlayers = orderedSets
          .filter((set) => set.setName !== "Unsold Players")
          .flatMap((set) =>
            set.players.map((player) => ({
              ...player,
              status: player.status || "PENDING",
            }))
          );
        room.auctionState.allPlayers = shuffleArray(rawAllPlayers);
        
        await saveRoom(room);
        socket.join(roomId);
        activeSocketRooms.set(socket.id, roomId);
        await emitTeamUpdate({ io, roomId });

        // Immediate sets update for the room creator
        const setsSnapshot = buildSetsSnapshot(room);
        socket.emit("setsUpdate", {
          roomId,
          sets: setsSnapshot,
        });

        callback({ ok: true, room: serializeRoom(room), roomId });
        await emitPublicRoomCount(io);
      });
    });

    socket.on("joinRoom", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, name, team, spectator } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const expectedRoomVisibility = String(payload.expectedRoomVisibility || "").toLowerCase();
        const user = buildUserPayload({
          socket,
          userId: payload.userId,
          name,
          team,
          roomId: normalizedRoomId,
          spectator,
        });

        if (!normalizedRoomId || !user.name) {
          callback({ ok: false, message: "roomId and name are required" });
          return;
        }

        if (!user.isSpectator && !user.team) {
          callback({ ok: false, message: "Pick a team (or join as spectator when the room has 10 teams)" });
          return;
        }

        const existingRoom = await getRoom(normalizedRoomId);
        if (!existingRoom) {
          callback({ ok: false, message: "Room does not exist. Enter a valid auction room code." });
          return;
        }

        if (expectedRoomVisibility === "private" && existingRoom.roomVisibility !== "private") {
          callback({ ok: false, message: "Enter a valid private room code." });
          return;
        }

        const { error, room, reconnected } = await joinRoom({
          roomId: normalizedRoomId,
          user,
        });

        if (error) {
          callback({ ok: false, message: error });
          return;
        }

        socket.join(normalizedRoomId);
        activeSocketRooms.set(socket.id, normalizedRoomId);
        await emitTeamUpdate({ io, roomId: normalizedRoomId });
        await emitPublicRoomCount(io);
        
        if (Array.isArray(room.auctionState?.sets) && room.auctionState.sets.length > 0) {
          const directSetsSnapshot = buildSetsSnapshot(room);
          socket.emit("setsUpdate", {
            roomId: normalizedRoomId,
            sets: directSetsSnapshot,
          });
          await emitSetsUpdate({ io, roomId: normalizedRoomId, room });
          await emitUnsoldPoolUpdate({ io, roomId: normalizedRoomId, room });
        }
        
        maybeAfterJoinEffects(io, normalizedRoomId);
        socket.emit("chatHistory", {
          roomId: normalizedRoomId,
          messages: Array.isArray(room.chatHistory) ? room.chatHistory : [],
        });

        if (!reconnected) {
          if (!user.isSpectator) {
            const now = Date.now();
            await emitAuctionChat({
              io,
              roomId: normalizedRoomId,
              message: "",
              auctionEvent: {
                type: "playerJoined",
                playerName: user.name,
              },
              sentAt: now
            });
            await emitAuctionChat({
              io,
              roomId: normalizedRoomId,
              message: "",
              auctionEvent: {
                type: "teamSelected",
                playerName: user.name,
                team: user.team,
              },
              sentAt: now + 10
            });
          } else {
            await emitAuctionChat({
              io,
              roomId: normalizedRoomId,
              message: "",
              auctionEvent: {
                type: "playerJoined",
                playerName: user.name,
              },
              sentAt: Date.now()
            });
          }
        }

        const roomState = serializeRoom(room);
        const chatHistory = Array.isArray(room.chatHistory) ? room.chatHistory : [];
        const setsSnapshot =
          Array.isArray(room.auctionState?.sets) && room.auctionState.sets.length > 0
            ? buildSetsSnapshot(room)
            : [];
        socket.emit("joinRoom", { ok: true, room: roomState, chatHistory, sets: setsSnapshot });
        callback({ ok: true, room: roomState, chatHistory, sets: setsSnapshot });
      });
    });
    socket.on("changeTeam", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, userId, newTeam } = payload;
        const normalizedRoomId = String(roomId || "").trim().toUpperCase();

        const { error, room } = await changeTeam({
          roomId: normalizedRoomId,
          userId,
          newTeam,
        });

        if (error) {
          callback({ ok: false, message: error });
          return;
        }

        await emitTeamUpdate({ io, roomId: normalizedRoomId });

        const user = room.users.find((u) => u.userId === userId);
        if (user) {
          await emitAuctionChat({
            io,
            roomId: normalizedRoomId,
            message: "",
            auctionEvent: {
              type: "teamSelected",
              playerName: user.name,
              team: newTeam,
            },
            sentAt: Date.now(),
          });
        }

        callback({ ok: true, room: serializeRoom(room) });
      });
    });

    socket.on("leaveRoom", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const requestedRoomId = String(payload.roomId || "").trim().toUpperCase();
        const roomId = requestedRoomId || activeSocketRooms.get(socket.id);

        if (!roomId) {
          callback({ ok: true });
          return;
        }

        socket.leave(roomId);

        await leaveRoom({ roomId, socketId: socket.id });
        activeSocketRooms.delete(socket.id);
        lastChatAtByUser.delete(socket.id);

        await emitTeamUpdate({ io, roomId });
        await emitPublicRoomCount(io);

        callback({ ok: true });
      });
    });

    socket.on("getSetsSnapshot", async (payload = {}, callback = () => {}) => {
      const normalizedRoomId = String(payload.roomId || "").trim().toUpperCase();
      if (!normalizedRoomId) {
        callback({ ok: false, message: "roomId is required" });
        return;
      }

      const room = await getRoom(normalizedRoomId);
      if (!room) {
        callback({ ok: false, message: "Room not found" });
        return;
      }

      const sets = buildSetsSnapshot(room);
      socket.emit("setsUpdate", {
        roomId: normalizedRoomId,
        sets,
      });
      callback({ ok: true });
    });

    socket.on("leaveRoom", (payload = {}, callback = () => {}) => {
      const normalizedRoomId = String(payload.roomId || "").trim().toUpperCase();
      if (normalizedRoomId) {
        socket.leave(normalizedRoomId);
      }
      callback({ ok: true });
    });

    socket.on("getRoomInfo", async (payload = {}, callback = () => {}) => {
      const normalizedRoomId = String(payload.roomId || "").trim().toUpperCase();
      if (!normalizedRoomId) {
        return callback({ ok: false, message: "Room ID is required" });
      }

      const room = await getRoom(normalizedRoomId);
      if (!room) {
        return callback({ ok: false, message: "Room not found" });
      }

      callback({
        ok: true,
        auctionType: room.auctionType || "mega",
        visibility: room.roomVisibility || "public",
        adminName: room.adminUser?.name || "Admin",
      });
    });

    socket.on("getChatHistory", async (payload = {}, callback = () => {}) => {
      const normalizedRoomId = String(payload.roomId || "").trim().toUpperCase();
      if (!normalizedRoomId) {
        callback({ ok: false, message: "roomId is required" });
        return;
      }

      const room = await getRoom(normalizedRoomId);
      if (!room) {
        callback({ ok: false, message: "Room not found" });
        return;
      }

      const messages = Array.isArray(room.chatHistory) ? room.chatHistory : [];
      socket.emit("chatHistory", {
        roomId: normalizedRoomId,
        messages,
      });
      callback({ ok: true, roomId: normalizedRoomId, messages });
    });

    socket.on("sendChatMessage", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, message } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        const user = room.users.find((u) => u.socketId === socket.id);
        if (!user) {
          callback({ ok: false, message: "User is not part of this room" });
          return;
        }

        const trimmedMessage = String(message || "").trim();
        if (!trimmedMessage) {
          callback({ ok: false, message: "Message is required" });
          return;
        }

        if (trimmedMessage.length > MAX_CHAT_MESSAGE_LENGTH) {
          callback({
            ok: false,
            message: `Message too long (max ${MAX_CHAT_MESSAGE_LENGTH} chars)`,
          });
          return;
        }

        const now = Date.now();
        lastChatAtByUser.set(socket.id, now);

        const chatPayload = {
          roomId: normalizedRoomId,
          username: user.name,
          team: user.team,
          message: trimmedMessage,
          sentAt: now,
        };

        appendChatHistory(room, chatPayload);
        await saveRoom(room);
        io.to(normalizedRoomId).emit("chatMessage", chatPayload);
        callback({ ok: true });
      });
    });

    socket.on("startAuction", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, timerSeconds, accelerated, acceleratedTimerSeconds } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can start auction" });
          return;
        }

        try {
          await startAuctionCore({
            io,
            roomId: normalizedRoomId,
            timerSeconds,
            accelerated,
            acceleratedTimerSeconds,
          });
          callback({ ok: true });
        } catch (error) {
          callback({ ok: false, message: error.message });
        }
      });
    });

    socket.on("setAuctionTimer", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, timerSeconds, accelerated, acceleratedTimerSeconds } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can change timer settings" });
          return;
        }

      if (timerSeconds !== undefined) {
        const parsedTimer = Number(timerSeconds);
        if (!ALLOWED_TIMER_VALUES.has(parsedTimer)) {
          callback({ ok: false, message: "timerSeconds must be 5 or 10" });
          return;
        }
        const oldTimer = room.auctionState.timerConfigSeconds || DEFAULT_BID_TIMER_SECONDS;
        const newTimer = parsedTimer;
        if (oldTimer !== newTimer) {
          await emitAuctionChat({
            io,
            roomId: normalizedRoomId,
            message: `Timer changed from ${oldTimer}s to ${newTimer}s`,
          });
        }
        room.auctionState.timerConfigSeconds = parsedTimer;
      }

      if (accelerated !== undefined) {
        room.auctionState.accelerated = Boolean(accelerated);
        room.auctionState.acceleratedGlobal = Boolean(accelerated);
      }

      if (acceleratedTimerSeconds !== undefined) {
        const parsedAcceleratedTimer = Number(acceleratedTimerSeconds);
        if (!ALLOWED_ACCELERATED_VALUES.has(parsedAcceleratedTimer)) {
          callback({
            ok: false,
            message: "acceleratedTimerSeconds must be 2 or 3",
          });
          return;
        }
        room.auctionState.acceleratedTimerSeconds = parsedAcceleratedTimer;
      }

      if (room.auctionState.status === "RUNNING") {
        room.auctionState.timerSeconds = getActiveTimerSeconds(room.auctionState);
        await startBidTimer({ io, roomId: normalizedRoomId, reset: true });
      }

      await saveRoom(room);
      emitTimerUpdate({ io, roomId: normalizedRoomId, room });
      await emitTeamUpdate({ io, roomId: normalizedRoomId });
      callback({ ok: true, auctionState: room.auctionState });
      });
    });

    socket.on("selectUnsoldPlayers", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, playerIds = [] } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can select unsold players" });
          return;
        }

        if (!Array.isArray(playerIds)) {
          callback({ ok: false, message: "playerIds must be an array" });
          return;
        }

        const allowedIds = new Set(
          getUnsoldPlayers(room).map((player) => playerKey(player))
        );
        room.auctionState.selectedUnsoldPlayerIds = [...new Set(playerIds.map(String))].filter(
          (id) => allowedIds.has(id)
        );

        await saveRoom(room);
        await emitUnsoldPoolUpdate({ io, roomId: normalizedRoomId, room });
        await emitTeamUpdate({ io, roomId: normalizedRoomId });
        callback({
          ok: true,
          selectedUnsoldPlayerIds: room.auctionState.selectedUnsoldPlayerIds,
        });
      });
    });

    socket.on("reauctionUnsoldPlayers", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, playerIds } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can re-auction players" });
          return;
        }

        const selectedIds = Array.isArray(playerIds)
          ? playerIds.map(String)
          : room.auctionState.selectedUnsoldPlayerIds;

        if (!selectedIds.length) {
          callback({ ok: false, message: "No unsold players selected" });
          return;
        }

        const selectedIdSet = new Set(selectedIds);
        const unsoldPlayersComputed = getUnsoldPlayers(room);
        const selectedPlayers = unsoldPlayersComputed.filter((player) =>
          selectedIdSet.has(playerKey(player))
        );

        if (!selectedPlayers.length) {
          callback({ ok: false, message: "Selected players not found in unsold pool" });
          return;
        }

        const maxSetNumber = room.auctionState.sets.reduce(
          (maxNumber, set) => Math.max(maxNumber, set.setNumber || 0),
          0
        );

        room.auctionState.reauctionRound += 1;
        const reauctionSet = {
          setNumber: maxSetNumber + 1,
          setName: `Unsold Pool ${room.auctionState.reauctionRound}`,
          players: selectedPlayers,
          totalPlayers: selectedPlayers.length,
          isReauction: true,
        };

        room.auctionState.sets = [...room.auctionState.sets, reauctionSet];
        room.auctionState.selectedUnsoldPlayerIds = [];
        await saveRoom(room);
        
        io.to(normalizedRoomId).emit("reauctionSetCreated", {
          roomId: normalizedRoomId,
          set: reauctionSet,
        });
        await emitUnsoldPoolUpdate({ io, roomId: normalizedRoomId, room });
        await emitTeamUpdate({ io, roomId: normalizedRoomId });

        callback({
          ok: true,
          set: reauctionSet,
          unsoldPoolCount: getUnsoldPlayers(room).length,
        });
      });
    });

    socket.on("toggleAcceleratedMode", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, enabled, scope = "global", setNumber, timerSeconds } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can toggle accelerated mode" });
          return;
        }

      if (timerSeconds !== undefined) {
        const parsedAcceleratedTimer = Number(timerSeconds);
        if (!ALLOWED_ACCELERATED_VALUES.has(parsedAcceleratedTimer)) {
          callback({ ok: false, message: "timerSeconds must be 2 or 3" });
          return;
        }
        room.auctionState.acceleratedTimerSeconds = parsedAcceleratedTimer;
      }

      if (scope === "set") {
        const parsedSetNumber = Number(setNumber);
        if (!Number.isInteger(parsedSetNumber) || parsedSetNumber < 1) {
          callback({ ok: false, message: "Valid setNumber is required when scope is set" });
          return;
        }
        room.auctionState.acceleratedSetMap[parsedSetNumber] = Boolean(enabled);
      } else {
        room.auctionState.acceleratedGlobal = Boolean(enabled);
        room.auctionState.accelerated = room.auctionState.acceleratedGlobal;
      }

      if (room.auctionState.status === "RUNNING") {
        room.auctionState.timerSeconds = getActiveTimerSeconds(room.auctionState);
        await startBidTimer({ io, roomId: normalizedRoomId, reset: true });
      }

      await saveRoom(room);
      io.to(normalizedRoomId).emit("acceleratedModeUpdate", {
        roomId: normalizedRoomId,
        acceleratedGlobal: room.auctionState.acceleratedGlobal,
        acceleratedSetMap: room.auctionState.acceleratedSetMap,
        acceleratedTimerSeconds: room.auctionState.acceleratedTimerSeconds,
      });

      emitTimerUpdate({ io, roomId: normalizedRoomId, room });
      await emitUnsoldPoolUpdate({ io, roomId: normalizedRoomId, room });
      await emitTeamUpdate({ io, roomId: normalizedRoomId });
      callback({ ok: true, auctionState: room.auctionState });
      });
    });

    socket.on("pauseAuction", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can pause the auction" });
          return;
        }

        if (room.auctionState.status !== "RUNNING") {
          callback({ ok: false, message: "Auction is not running" });
          return;
        }

        room.auctionState.auctionPaused = true;
        await clearBidTimer(normalizedRoomId);
        await saveRoom(room);
        
        emitTimerUpdate({ io, roomId: normalizedRoomId, room });
        await emitTeamUpdate({ io, roomId: normalizedRoomId });
        io.to(normalizedRoomId).emit("auctionPaused", {
          roomId: normalizedRoomId,
          auctionPaused: true,
        });
        callback({ ok: true });
      });
    });

    socket.on("resumeAuction", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can resume the auction" });
          return;
        }

        room.auctionState.auctionPaused = false;
        if (room.auctionState.status === "RUNNING") {
          await startBidTimer({ io, roomId: normalizedRoomId, reset: false });
        }
        await saveRoom(room);
        
        emitTimerUpdate({ io, roomId: normalizedRoomId, room });
        await emitTeamUpdate({ io, roomId: normalizedRoomId });
        io.to(normalizedRoomId).emit("auctionResumed", {
          roomId: normalizedRoomId,
          auctionPaused: false,
        });
        callback({ ok: true });
      });
    });

    socket.on("kickUser", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, userIdToKick } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can kick players" });
          return;
        }

        if (room.adminUserId === userIdToKick) {
          callback({ ok: false, message: "Cannot kick the admin" });
          return;
        }

        const kickResult = await kickUser({ roomId: normalizedRoomId, userIdToKick });
        if (kickResult.error) {
          callback({ ok: false, message: kickResult.error });
          return;
        }

        const userSocket = io.sockets.sockets.get(
          room.users.find((u) => u.userId === userIdToKick)?.socketId
        );
        if (userSocket) {
          userSocket.emit("kicked", { message: "You have been kicked out from this room" });
          userSocket.disconnect();
        }

        await emitTeamUpdate({ io, roomId: normalizedRoomId });
        const kickMessagePayload = {
          roomId: normalizedRoomId,
          username: "Auction",
          team: "",
          message: `A player has been kicked out`,
          sentAt: Date.now(),
          isSystem: true,
        };
        appendChatHistory(room, kickMessagePayload);
        await saveRoom(room);
        io.to(normalizedRoomId).emit("chatMessage", kickMessagePayload);
        callback({ ok: true, message: "Player kicked successfully" });
        await emitPublicRoomCount(io);
      });
    });

    socket.on("placeBid", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId, amount, clientBidTs } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (room.auctionState.status !== "RUNNING" || !room.auctionState.currentPlayer) {
          callback({ ok: false, message: "Bidding is not active" });
          return;
        }

      if (room.auctionState.auctionPaused) {
        callback({ ok: false, message: "Auction is paused" });
        return;
      }

      const bidder = room.users.find((u) => u.socketId === socket.id);
      if (!bidder) {
        callback({ ok: false, message: "User is not part of this room" });
        return;
      }

      if (bidder.isSpectator) {
        callback({ ok: false, message: "Spectators cannot place bids" });
        return;
      }

      const now = Date.now();
      const lastBid = lastBidAtByUser.get(bidder.userId) || 0;
      if (now - lastBid < BID_RATE_LIMIT_MS) {
        callback({ ok: false, message: "Bid rate limit: please wait before bidding again" });
        return;
      }
      lastBidAtByUser.set(bidder.userId, now);

      if (room.auctionState.highestBidder === bidder.team) {
        callback({ ok: false, message: "Same team cannot bid consecutively" });
        return;
      }

      const basePrice = toPrice(room.auctionState.currentPlayer.basePrice);
      const hasLeader = Boolean(room.auctionState.highestBidder);

      let nextBid;
      let minAllowedBid;

      if (!hasLeader) {
        // Opening bid must be exactly the player's base price (never base + increment)
        nextBid = basePrice;
        minAllowedBid = basePrice;
        if (Number.isFinite(Number(amount)) && Number(amount) !== basePrice) {
          callback({
            ok: false,
            message: `Opening bid must be exactly ₹${basePrice} Cr (base price)`,
          });
          return;
        }
      } else {
        const increment = getBidIncrement(room.auctionState.highestBid);
        minAllowedBid = toPrice(room.auctionState.highestBid + increment);
        nextBid =
          Number.isFinite(Number(amount)) && Number(amount) > room.auctionState.highestBid
            ? toPrice(Number(amount))
            : minAllowedBid;
        if (nextBid < minAllowedBid) {
          callback({
            ok: false,
            message: `Bid must be at least ₹${minAllowedBid} Cr`,
          });
          return;
        }
      }

      const teamWallet = room.teamState[bidder.team];
      if (!teamWallet) {
        callback({ ok: false, message: "Team wallet not found" });
        return;
      }

      // Validate bid using canPlaceBid function
      const validation = canPlaceBid(teamWallet, room.auctionState.currentPlayer, nextBid);
      if (!validation.allowed) {
        let message;
        switch (validation.reason) {
          case "NOT_ENOUGH_MONEY":
            message = "Not enough money";
            break;
          case "MAX_PLAYERS_REACHED":
            message = "Max player limit reached";
            break;
          case "MAX_OVERSEAS_REACHED":
            message = "Max overseas limit reached";
            break;
          default:
            message = "Bid not allowed";
        }
        callback({
          ok: false,
          message,
          reason: validation.reason,
        });
        return;
      }

      const candidateBidTs = Number.isFinite(Number(clientBidTs))
        ? Number(clientBidTs)
        : Date.now();

      // ATOMIC UPDATE FOR CLUSTER-WIDE CONSISTENCY
      const freshRoom = await getRoom(normalizedRoomId);
      const currentTopTs = Number(freshRoom.auctionState.highestBidTimestamp || 0);

      if (freshRoom.auctionState.highestBid > nextBid) {
        callback({ ok: false, message: "Someone else already placed a higher bid" });
        return;
      }

      if (nextBid === freshRoom.auctionState.highestBid && candidateBidTs < currentTopTs) {
        callback({ ok: false, message: "Bid lost tie-break (later timestamp wins)" });
        return;
      }

      freshRoom.auctionState.highestBid = nextBid;
      freshRoom.auctionState.highestBidder = bidder.team;
      freshRoom.auctionState.highestBidTimestamp = candidateBidTs;
      freshRoom.auctionState.status = "RUNNING";

      console.log(`[BID_PLACED] ${bidder.team} bid ${nextBid} for ${freshRoom.auctionState.currentPlayer?.name}`);

      await saveRoom(freshRoom);
      await startBidTimer({ io, roomId: normalizedRoomId, reset: true });
      
      io.to(normalizedRoomId).emit("bidUpdate", {
        roomId: normalizedRoomId,
        player: freshRoom.auctionState.currentPlayer,
        highestBid: freshRoom.auctionState.highestBid,
        highestBidder: freshRoom.auctionState.highestBidder,
        highestBidTimestamp: freshRoom.auctionState.highestBidTimestamp,
        timerSeconds: getActiveTimerSeconds(freshRoom.auctionState),
      });

      const playerName = freshRoom.auctionState.currentPlayer?.name || "Player";
      await emitAuctionChat({
        io,
        roomId: normalizedRoomId,
        message: `${bidder.team} bid ₹${freshRoom.auctionState.highestBid} Cr for ${playerName}`,
        auctionEvent: {
          type: "bid",
          playerName,
          team: bidder.team,
          amount: freshRoom.auctionState.highestBid,
        },
      });

      await emitTeamUpdate({ io, roomId: normalizedRoomId, room: freshRoom });
      callback({ ok: true, highestBid: freshRoom.auctionState.highestBid });
      });
    });

    socket.on("closePlayer", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can close player" });
          return;
        }

      await closeCurrentPlayer({ io, roomId: normalizedRoomId });
      callback({ ok: true });
      });
    });

    socket.on("startAcceleratedRound", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can start accelerated round" });
          return;
        }

        const result = await startAcceleratedRound({ io, roomId: normalizedRoomId });
        callback(result || { ok: true });
      });
    });

    socket.on("endAuction", async (payload = {}, callback = () => {}) => {
      await wrapHandler(async () => {
        const { roomId } = payload;
        const normalizedRoomId = (roomId || "").trim().toUpperCase();
        const room = await getRoom(normalizedRoomId);

        if (!room) {
          callback({ ok: false, message: "Room not found" });
          return;
        }

        if (!isAdminSocket(room, socket.id)) {
          callback({ ok: false, message: "Only admin can end auction" });
          return;
        }

        await clearSetIntroTimer(normalizedRoomId);
        await clearBidTimer(normalizedRoomId);
        await clearRoomTimer(normalizedRoomId);
        
        await emitAuctionEnded({
          io,
          roomId: normalizedRoomId,
          room,
          message: "Auction ended by admin",
          reason: "admin",
        });
        callback({ ok: true });
      });
    });

    socket.on("disconnect", async () => {
      await wrapHandler(async () => {
        const roomId = activeSocketRooms.get(socket.id);
        if (!roomId) return;

        socket.leave(roomId);
        await leaveRoom({ roomId, socketId: socket.id });
        activeSocketRooms.delete(socket.id);
        lastChatAtByUser.delete(socket.id);

        await emitTeamUpdate({ io, roomId });
        await emitPublicRoomCount(io);
      });
    });
  });
};

module.exports = {
  registerAuctionSocketHandlers,
};