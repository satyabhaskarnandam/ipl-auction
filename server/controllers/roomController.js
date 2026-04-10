const MAX_FRANCHISE_SLOTS = 10;
const MAX_SPECTATORS = 5;
/** Max connections per room: 10 franchise players + 5 spectators. */
const MAX_USERS_PER_ROOM = MAX_FRANCHISE_SLOTS + MAX_SPECTATORS;
const SPECTATOR_TEAM = "SPEC";
const INITIAL_TEAM_PURSE_MEGA = 125;
const INITIAL_TEAM_PURSE_MINI = 0;
const fs = require('fs');
const path = require('path');
const EMPTY_ROOM_TTL_MS = 120000;

/** Load player database for role lookups in Mini Auction squads */
let PLAYERS_DB = [];
try {
  const playersPath = path.join(__dirname, '..', '..', 'data', 'players.json');
  if (fs.existsSync(playersPath)) {
    PLAYERS_DB = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
  }
} catch (err) {
  console.error("Failed to load players.json for role hydration:", err);
}

const getRoleByName = (name) => {
  const cleanName = name.replace(/\(T\)$/, "").trim().toLowerCase();
  const player = PLAYERS_DB.find(p => p.name.trim().toLowerCase() === cleanName);
  return player?.role || null;
};

const OVERSEAS_NAMES = new Set([
  "Noor Ahmad", "Dewald Brevis", "Nathan Ellis", "Jamie Overton",
  "Trent Boult", "Will Jacks", "Allah Ghazanfar", "Sherfane Rutherford",
  "Mitchell Santner", "Ryan Rickelton", "Corbin Bosch",
  "Josh Hazlewood", "Phil Salt", "Tim David", "Jacob Bethell", "Nuwan Thushara", "Romario Shepherd",
  "Sunil Narine", "Rovman Powell",
  "Heinrich Klaasen", "Pat Cummins", "Travis Head", "Eshan Malinga", "Brydon Carse", "Kamindu Mendis",
  "Mitchell Starc", "Tristan Stubbs", "Dushmantha Chameera",
  "Marcus Stoinis", "Marco Jansen", "Azmatullah Omarzai", "Lockie Ferguson", "Mitchell Owen", "Xavier Bartlett",
  "Jofra Archer", "Shimron Hetmyer", "Nandre Burger", "Sam Curran", "Kwena Maphaka", "Donovan Ferreira", "Lhuan-Dre Pretorius",
  "Rashid Khan", "Jos Buttler", "Kagiso Rabada", "Glenn Phillips",
  "Nicholas Pooran", "Mitchell Marsh", "Aiden Markram", "Matthew Breetzke"
]);

const miniPlayer = (name, soldPrice) => {
  const cleanName = name.replace(/\(T\)$/, "").trim();
  const country = OVERSEAS_NAMES.has(cleanName) ? "Overseas" : "India";
  const role = getRoleByName(cleanName);
  return { name, soldPrice, basePrice: soldPrice, country, role };
};

const MINI_SQUAD_PRESETS = {
  CSK: {
    purseRemaining: 43.4,
    players: [
      miniPlayer("Sanju Samson(T)", 18),
      miniPlayer("Ruturaj Gaikwad", 18),
      miniPlayer("Shivam Dube", 12),
      miniPlayer("Noor Ahmad", 10),
      miniPlayer("Khaleel Ahmed", 4.8),
      miniPlayer("MS Dhoni", 4),
      miniPlayer("Anshul Kamboj", 3.4),
      miniPlayer("Dewald Brevis", 2.2),
      miniPlayer("Gurpanjeet Singh", 2.2),
      miniPlayer("Nathan Ellis", 2),
      miniPlayer("Jamie Overton", 1.5),
      miniPlayer("Mukesh Choudhary", 0.3),
      miniPlayer("Ramakrishna Ghosh", 0.3),
      miniPlayer("Shreyas Gopal", 0.3),
      miniPlayer("Ayush Mhatre", 0.3),
      miniPlayer("Urvil Patel", 0.3),
    ],
  },
  MI: {
    purseRemaining: 2.75,
    players: [
      miniPlayer("Jasprit Bumrah", 18),
      miniPlayer("Hardik Pandya", 16.35),
      miniPlayer("Suryakumar Yadav", 16.35),
      miniPlayer("Rohit Sharma", 16.3),
      miniPlayer("Trent Boult", 12.5),
      miniPlayer("Deepak Chahar", 9.25),
      miniPlayer("Tilak Verma", 8),
      miniPlayer("Naman Dhir", 5.25),
      miniPlayer("Will Jacks", 5.25),
      miniPlayer("Allah Ghazanfar", 4.8),
      miniPlayer("Sherfane Rutherford(T)", 2.6),
      miniPlayer("Mitchell Santner", 2),
      miniPlayer("Shardul Thakur(T)", 2),
      miniPlayer("Ryan Rickelton", 1),
      miniPlayer("Corbin Bosch", 0.75),
      miniPlayer("Robin Minz", 0.65),
      miniPlayer("Ashwani Kumar", 0.3),
      miniPlayer("Mayank Markande(T)", 0.3),
      miniPlayer("Raghu Sharma", 0.3),
      miniPlayer("Raj Angad Bawa", 0.3),
    ],
  },
  RCB: {
    purseRemaining: 16.4,
    players: [
      miniPlayer("Virat Kohli", 21),
      miniPlayer("Josh Hazlewood", 12.5),
      miniPlayer("Phil Salt", 11.5),
      miniPlayer("Rajat Patidar", 11),
      miniPlayer("Jitesh Sharma", 11),
      miniPlayer("Bhuvneshwar Kumar", 10.75),
      miniPlayer("Rasikh Dar", 6),
      miniPlayer("Krunal Pandya", 5.75),
      miniPlayer("Yash Dayal", 5),
      miniPlayer("Tim David", 3),
      miniPlayer("Jacob Bethell", 2.6),
      miniPlayer("Suyash Sharma", 2.6),
      miniPlayer("Devdutt Padikkal", 2),
      miniPlayer("Nuwan Thushara", 1.6),
      miniPlayer("Romario Shepherd", 1.5),
      miniPlayer("Swapnil Singh", 0.5),
      miniPlayer("Abhinandan Singh", 0.3),
    ],
  },
  KKR: {
    purseRemaining: 64.3,
    players: [
      miniPlayer("Rinku Singh", 13),
      miniPlayer("Sunil Narine", 12),
      miniPlayer("Varun Chakravarthy", 12),
      miniPlayer("Harshit Rana", 4),
      miniPlayer("Ramandeep Singh", 4),
      miniPlayer("Angkrish Raghuvanshi", 3),
      miniPlayer("Vaibhav Arora", 1.8),
      miniPlayer("Ajinkya Rahane", 1.5),
      miniPlayer("Rovman Powell", 1.5),
      miniPlayer("Manish Pandey", 0.75),
      miniPlayer("Umran Malik", 0.75),
      miniPlayer("Anukul Roy", 0.4),
    ],
  },
  SRH: {
    purseRemaining: 25.5,
    players: [
      miniPlayer("Heinrich Klaasen", 23),
      miniPlayer("Pat Cummins", 18),
      miniPlayer("Abhishek Sharma", 14),
      miniPlayer("Travis Head", 14),
      miniPlayer("Ishan Kishan", 11.25),
      miniPlayer("Harshal Patel", 8),
      miniPlayer("Nitish Kumar Reddy", 6),
      miniPlayer("Eshan Malinga", 1.2),
      miniPlayer("Brydon Carse", 1),
      miniPlayer("Jaydev Unadkat", 1),
      miniPlayer("Kamindu Mendis", 0.75),
      miniPlayer("Zeeshan Ansari", 0.4),
      miniPlayer("Aniket Verma", 0.3),
      miniPlayer("Harsh Dubey", 0.3),
      miniPlayer("Smaran Ravichandran", 0.3),
    ],
  },
  DC: {
    purseRemaining: 21.8,
    players: [
      miniPlayer("Axar Patel", 16.5),
      miniPlayer("KL Rahul", 14),
      miniPlayer("Kuldeep Yadav", 13.25),
      miniPlayer("Mitchell Starc", 11.75),
      miniPlayer("T. Natarajan", 10.75),
      miniPlayer("Tristan Stubbs", 10),
      miniPlayer("Mukesh Kumar", 8),
      miniPlayer("Nitish Rana(T)", 4.2),
      miniPlayer("Abhishek Porel", 4),
      miniPlayer("Ashutosh Sharma", 3.8),
      miniPlayer("Sameer Rizvi", 0.95),
      miniPlayer("Dushmantha Chameera", 0.75),
      miniPlayer("Vipraj Nigam", 0.5),
      miniPlayer("Karun Nair", 0.5),
      miniPlayer("Madhav Tiwari", 0.4),
      miniPlayer("Ajay Mandal", 0.3),
      miniPlayer("Tripurana Vijay", 0.3),
    ],
  },
  PBKS: {
    purseRemaining: 11.5,
    players: [
      miniPlayer("Arshdeep Singh", 18),
      miniPlayer("Yuzvendra Chahal", 18),
      miniPlayer("Marcus Stoinis", 11),
      miniPlayer("Marco Jansen", 7),
      miniPlayer("Shashank Singh", 5.5),
      miniPlayer("Nehal Wadhera", 4.2),
      miniPlayer("Prabhsimran Singh", 4),
      miniPlayer("Priyansh Arya", 3.8),
      miniPlayer("Mitchell Owen", 3),
      miniPlayer("Azmatullah Omarzai", 2.4),
      miniPlayer("Lockie Ferguson", 2),
      miniPlayer("Vyshak Vijaykumar", 1.8),
      miniPlayer("Harnoor Brar", 1.5),
      miniPlayer("Yash Thakur", 1.6),
      miniPlayer("Xavier Bartlett", 0.8),
      miniPlayer("Vishnu Vinod", 0.95),
      miniPlayer("Musheer Khan", 0.3),
      miniPlayer("Pyla Avinash", 0.3),
      miniPlayer("Harnoor Pannu", 0.3),
      miniPlayer("Suryansh Shedge", 0.3),
    ],
  },
  RR: {
    purseRemaining: 16.05,
    players: [
      miniPlayer("Yashaswi Jaiswal", 18),
      miniPlayer("Ravindra Jadeja(T)", 14),
      miniPlayer("Riyan Parag", 14),
      miniPlayer("Dhruv Jurel", 14),
      miniPlayer("Jofra Archer", 12.5),
      miniPlayer("Shimron Hetmyer", 11),
      miniPlayer("Tushar Deshpande", 6.5),
      miniPlayer("Sandeep Sharma", 4),
      miniPlayer("Nandre Burger", 3.5),
      miniPlayer("Sam Curran(T)", 2.4),
      miniPlayer("Kwena Maphaka", 1.5),
      miniPlayer("Vaibhav Suryavanshi", 1.1),
      miniPlayer("Donovan Ferreira(T)", 1),
      miniPlayer("Shubham Dubey", 0.8),
      miniPlayer("Yudhvir Charak", 0.35),
      miniPlayer("Lhuan-Dre Pretorius", 0.3),
    ],
  },
  GT: {
    purseRemaining: 12.9,
    players: [
      miniPlayer("Rashid Khan", 18),
      miniPlayer("Shubman Gill", 16.5),
      miniPlayer("Jos Buttler", 15.75),
      miniPlayer("Mohammad Siraj", 12.25),
      miniPlayer("Kagiso Rabada", 10.75),
      miniPlayer("Prasidh Krishna", 9.5),
      miniPlayer("Sai Sudharshan", 8.5),
      miniPlayer("Rahul Tewatia", 4),
      miniPlayer("Shahrukh Khan", 4),
      miniPlayer("Washington Sundar", 3.2),
      miniPlayer("Glenn Phillips", 2),
      miniPlayer("R Sai Kishore", 2),
      miniPlayer("Arshad Khan", 1.3),
      miniPlayer("Gurnoor Singh Brar", 1.3),
      miniPlayer("Ishant Sharma", 0.75),
      miniPlayer("Jayant Yadav", 0.75),
      miniPlayer("Kumar Kushagra", 0.65),
      miniPlayer("Anuj Rawat", 0.3),
      miniPlayer("Manav Suthar", 0.3),
      miniPlayer("Nishant Sindhu", 0.3),
    ],
  },
  LSG: {
    purseRemaining: 22.95,
    players: [
      miniPlayer("Rishabh Pant", 27),
      miniPlayer("Nicholas Pooran", 21),
      miniPlayer("Md Shami(T)", 10),
      miniPlayer("Mayank Yadav", 11),
      miniPlayer("Avesh Khan", 9.75),
      miniPlayer("Abdul Samad", 4.2),
      miniPlayer("Ayush Badoni", 4),
      miniPlayer("Mohsin Khan", 4),
      miniPlayer("Mitchell Marsh", 3.4),
      miniPlayer("Shahbaz Ahmed", 2.4),
      miniPlayer("Aiden Markram", 2),
      miniPlayer("Manimaran Siddharth", 0.75),
      miniPlayer("Matthew Breetzke", 0.75),
      miniPlayer("Akash Singh", 0.3),
      miniPlayer("Arjun Tendulkar(T)", 0.3),
      miniPlayer("Arshin Kulkarni", 0.3),
      miniPlayer("Digvesh Rathi", 0.3),
      miniPlayer("Himmat Singh", 0.3),
      miniPlayer("Prince Yadav", 0.3),
    ],
  },
};

/** All 10 IPL teams */
const ALL_IPL_TEAMS = ["CSK", "MI", "RCB", "KKR", "SRH", "DC", "PBKS", "RR", "GT", "LSG"];

let redisClient = null;
const setRedisClient = (client) => {
  redisClient = client;
};

// Local cache for performance, synced with Redis
const rooms = new Map();
const ROOMS_REDIS_KEY = "ipl_auction_rooms";

const ROOMS_REDIS_KEY = "ipl_auction_rooms";

const saveRoom = async (room) => {
  if (!redisClient || !room?.roomId) return;
  // Serialize Sets and Maps if needed (pickedPlayerIds is a Set)
  const serialized = JSON.parse(JSON.stringify(room, (key, value) => {
    if (value instanceof Set) return Array.from(value);
    if (value instanceof Map) return Object.fromEntries(value);
    return value;
  }));
  await redisClient.hset(ROOMS_REDIS_KEY, room.roomId.toUpperCase(), JSON.stringify(serialized));
};

const loadRoom = async (roomId) => {
  if (!redisClient || !roomId) return null;
  const data = await redisClient.hget(ROOMS_REDIS_KEY, roomId.toUpperCase());
  if (!data) return null;
  const room = JSON.parse(data, (key, value) => {
    if (key === "pickedPlayerIds") return new Set(value);
    return value;
  });
  // Sync to local cache for legacy support (will still be eventually consistent)
  rooms.set(roomId.toUpperCase(), room);
  return room;
};

const clearRoomCleanupTimer = (roomId) => {
  // Clearing local cleanup timers (only relevant if this instance created it)
};

/** Initialize teamState for all 10 teams */
const getInitialPurseByAuctionType = (auctionType = "mega") =>
  auctionType === "mini" ? INITIAL_TEAM_PURSE_MINI : INITIAL_TEAM_PURSE_MEGA;

const createInitialTeamState = (initialPurse, auctionType = "mega") => {
  const teamState = {};
  ALL_IPL_TEAMS.forEach((teamId) => {
    const preset = auctionType === "mini" ? MINI_SQUAD_PRESETS[teamId] : null;
    const players = Array.isArray(preset?.players) ? preset.players : [];
    const purse = Number.isFinite(preset?.purseRemaining) ? preset.purseRemaining : initialPurse;

    teamState[teamId] = {
      purse,
      purseRemaining: purse,
      players,
      overseasCount: players.filter(p => p.country && p.country !== "India").length,
      totalPlayers: players.length,
    };
  });
  return teamState;
};

const ensureMiniSquadsHydrated = (room) => {
  if (!room || room.auctionType !== "mini") return;
  if (!room.teamState || typeof room.teamState !== "object") {
    room.teamState = createInitialTeamState(INITIAL_TEAM_PURSE_MINI, "mini");
    return;
  }

  const hasAnyPlayers = ALL_IPL_TEAMS.some((teamId) => {
    const players = room.teamState?.[teamId]?.players;
    return Array.isArray(players) && players.length > 0;
  });

  if (!hasAnyPlayers) {
    room.teamState = createInitialTeamState(INITIAL_TEAM_PURSE_MINI, "mini");
  }
};

const createInitialAuctionState = () => ({
  status: "WAITING",
  sets: [],
  setIndex: 0,
  playerIndex: -1,
  roundId: 0,
  currentSet: null,
  currentPlayer: null,
  highestBid: null,
  highestBidder: null,
  highestBidTimestamp: null,
  timerSeconds: 0,
  timerConfigSeconds: 10,
  accelerated: false,
  acceleratedTimerSeconds: 3,
  acceleratedGlobal: false,
  acceleratedSetMap: {},
  unsoldPlayersPool: [],
  selectedUnsoldPlayerIds: [],
  reauctionRound: 0,
  autoStartSecondsRemaining: null,
  auctionEnded: false,
  endMessage: "",
  endReason: "",
  teamRatings: [],
  /** Admin pause: freezes bid timer; bidding disabled while true */
  auctionPaused: false,
  /** Accelerated round state */
  acceleratedRound: {
    active: false,
    playerSelections: {}, // teamId -> Set of playerIds
    started: false,
  },
  hasStarted: false,
  acceleratedComplete: false,
  statusMessage: "",
});

const countSpectators = (room) => room.users.filter((u) => u.isSpectator).length;

const isFranchiseFull = (room) => room.teamsSelected.length >= MAX_FRANCHISE_SLOTS;

const pickNextAdminUserId = (room) => {
  const franchiseUser = room.users.find((u) => !u.isSpectator);
  return franchiseUser?.userId || room.users[0]?.userId;
};

const createRoom = async ({ roomId, adminUser, auctionType = "mega", roomVisibility = "public" }) => {
  const normalizedRoomId = roomId.toUpperCase();
  const existing = await loadRoom(normalizedRoomId);
  if (existing) {
    return { error: "Room already exists" };
  }

  const normalizedAuctionType = String(auctionType || "mega").toLowerCase() === "mini" ? "mini" : "mega";
  const initialPurse = getInitialPurseByAuctionType(normalizedAuctionType);

  const user = { ...adminUser, isSpectator: !!adminUser.isSpectator };

  const now = Date.now();
  const room = {
    roomId: normalizedRoomId,
    adminUserId: user.userId,
    roomVisibility: roomVisibility === "private" ? "private" : "public",
    users: [user],
    chatHistory: [
      {
        roomId: normalizedRoomId,
        username: "Auction",
        team: "",
        message: "",
        sentAt: now,
        isSystem: true,
        auctionEvent: { type: "playerJoined", playerName: user.name },
      },
      ...(!user.isSpectator ? [{
        roomId: normalizedRoomId,
        username: "Auction",
        team: "",
        message: "",
        sentAt: now + 1,
        isSystem: true,
        auctionEvent: { type: "teamSelected", playerName: user.name, team: user.team },
      }] : [])
    ],
    teamsSelected: user.isSpectator ? [] : [user.team],
    teamState: createInitialTeamState(initialPurse, normalizedAuctionType),
    auctionType: normalizedAuctionType,
    initialPurse,
    auctionState: createInitialAuctionState(),
    kickedUserIds: [],
    createdAt: now,
  };

  await saveRoom(room);
  rooms.set(normalizedRoomId, room);
  return { room };
};

const getRoom = async (roomId) => {
  return await loadRoom(roomId);
};

const removeRoom = async (roomId) => {
  if (!roomId) return false;
  if (redisClient) {
    await redisClient.hdel(ROOMS_REDIS_KEY, roomId.toUpperCase());
  }
  return rooms.delete(roomId.toUpperCase());
};

const joinRoom = async ({ roomId, user }) => {
  const normalizedRoomId = roomId.toUpperCase();
  let room = await loadRoom(normalizedRoomId);
  const joinAsSpectator = Boolean(user.isSpectator);
  const effectiveTeam = joinAsSpectator ? SPECTATOR_TEAM : user.team;

  if (room && room.kickedUserIds && room.kickedUserIds.includes(user.userId)) {
    return { error: "You have been kicked out from this room and cannot rejoin." };
  }

  if (!room) {
    return {
      error: "Room does not exist. Enter a valid auction room code.",
    };
  }
  
  ensureMiniSquadsHydrated(room);

  const existingUserIndex = room.users.findIndex((u) => u.userId === user.userId);
  if (existingUserIndex !== -1) {
    const existingUser = room.users[existingUserIndex];
    room.users[existingUserIndex] = {
      ...existingUser,
      socketId: user.socketId,
      name: user.name,
      roomId: user.roomId,
      lastSeenAt: Date.now(),
    };
    await saveRoom(room);
    return { room, reconnected: true };
  }

  if (joinAsSpectator) {
    if (!isFranchiseFull(room)) {
      return {
        error:
          "Spectators can only join after all 10 IPL teams are taken. Pick a team or wait.",
      };
    }
    if (countSpectators(room) >= MAX_SPECTATORS) {
      return { error: "Maximum 5 spectators allowed in this room." };
    }
    if (room.users.length >= MAX_USERS_PER_ROOM) {
      return { error: "Room is full (10 players + 5 spectators)." };
    }

    room.users.push({
      ...user,
      team: SPECTATOR_TEAM,
      isSpectator: true,
      joinedAt: Date.now(),
    });
    await saveRoom(room);
    return { room };
  }

  if (isFranchiseFull(room)) {
    return {
      error:
        "All franchise slots are full. Join as a spectator (max 5) if you only want to watch.",
    };
  }

  if (room.teamsSelected.includes(user.team)) {
    return { error: "Selected team is already taken" };
  }

  if (room.users.length >= MAX_USERS_PER_ROOM) {
    return { error: "Room is full" };
  }

  room.users.push({
    ...user,
    team: effectiveTeam,
    isSpectator: false,
    joinedAt: Date.now(),
  });
  room.teamsSelected.push(user.team);
  room.teamState[user.team] = room.teamState[user.team] || {
    purse: room.initialPurse,
    purseRemaining: room.initialPurse,
    players: [],
    overseasCount: 0,
    totalPlayers: 0,
  };

  await saveRoom(room);
  return { room };
};

const leaveRoom = async ({ roomId, socketId }) => {
  const normalizedRoomId = roomId.toUpperCase();
  const room = await loadRoom(normalizedRoomId);
  if (!room) return { roomDeleted: false };

  const userIndex = room.users.findIndex((u) => u.socketId === socketId);
  if (userIndex === -1) return { roomDeleted: false };

  const [removedUser] = room.users.splice(userIndex, 1);

  if (!removedUser.isSpectator) {
    room.teamsSelected = room.teamsSelected.filter(
      (team) => team !== removedUser.team
    );
  }

  if (room.adminUserId === removedUser.userId && room.users.length > 0) {
    room.adminUserId = pickNextAdminUserId(room);
  }

  if (room.users.length === 0) {
    const isEnded = String(room.auctionState?.status || "").toUpperCase() === "ENDED";
    if (!isEnded) {
      // For performance in high-scale, we allow rooms to persist in Redis without explicit cleanup timers
      // unless we want to implement a TTL.
    }
  }

  await saveRoom(room);
  return { roomDeleted: false };
};

const kickUser = async ({ roomId, userIdToKick }) => {
  const normalizedRoomId = roomId.toUpperCase();
  const room = await loadRoom(normalizedRoomId);
  if (!room) return { error: "Room not found" };

  if (!room.kickedUserIds) {
    room.kickedUserIds = [];
  }

  if (!room.kickedUserIds.includes(userIdToKick)) {
    room.kickedUserIds.push(userIdToKick);
  }

  const userIndex = room.users.findIndex((u) => u.userId === userIdToKick);
  if (userIndex !== -1) {
    const [removedUser] = room.users.splice(userIndex, 1);
    if (!removedUser.isSpectator) {
      room.teamsSelected = room.teamsSelected.filter(
        (team) => team !== removedUser.team
      );
    }
  }

  await saveRoom(room);
  return { success: true, room };
};

const serializeRoom = (room) => {
  ensureMiniSquadsHydrated(room);
  return {
  roomId: room.roomId,
  auctionType: room.auctionType || "mega",
  adminUserId: room.adminUserId,
  userCount: room.users.length,
  franchiseSlotsFilled: room.teamsSelected.length,
  franchiseFull: isFranchiseFull(room),
  spectatorCount: countSpectators(room),
  maxSpectators: MAX_SPECTATORS,
  users: room.users.map((u) => ({
    userId: u.userId,
    name: u.name,
    team: u.team,
    teamName: u.teamName || u.team,
    roomId: u.roomId,
    joinedAt: u.joinedAt,
    isSpectator: Boolean(u.isSpectator),
  })),
  teamsSelected: room.teamsSelected,
  teamState: room.teamState,
  auctionState: {
    status: room.auctionState.status,
    auctionEnded: Boolean(room.auctionState.auctionEnded),
    endMessage: room.auctionState.endMessage || "",
    endReason: room.auctionState.endReason || "",
    teamRatings: Array.isArray(room.auctionState.teamRatings) ? room.auctionState.teamRatings : [],
    currentSet: room.auctionState.currentSet,
    playerIndex: room.auctionState.playerIndex,
    currentPlayer: room.auctionState.currentPlayer,
    highestBid: room.auctionState.highestBid,
    highestBidder: room.auctionState.highestBidder,
    timerSeconds: room.auctionState.timerSeconds,
    timerConfigSeconds: room.auctionState.timerConfigSeconds,
    accelerated: room.auctionState.accelerated,
    acceleratedTimerSeconds: room.auctionState.acceleratedTimerSeconds,
    acceleratedGlobal: room.auctionState.acceleratedGlobal,
    acceleratedSetMap: room.auctionState.acceleratedSetMap,
    unsoldPoolCount: room.auctionState.unsoldPlayersPool.length,
    selectedUnsoldCount: room.auctionState.selectedUnsoldPlayerIds.length,
    totalSets: room.auctionState.sets.length,
    autoStartSecondsRemaining: room.auctionState.autoStartSecondsRemaining,
    auctionPaused: Boolean(room.auctionState.auctionPaused),
    nextPlayerPreviewName: room.auctionState.nextPlayerPreviewName,
    nextPlayerPreviewKey: room.auctionState.nextPlayerPreviewKey,
    hasStarted: Boolean(room.auctionState.hasStarted),
    acceleratedComplete: Boolean(room.auctionState.acceleratedComplete),
    statusMessage: room.auctionState.statusMessage || "",
  },
  };
};

const getAllPublicRooms = async () => {
  try {
    if (!redisClient) return [];
    const allData = await redisClient.hgetall(ROOMS_REDIS_KEY);
    const publicRooms = [];
    
    Object.values(allData).forEach((rawRoom) => {
      const room = JSON.parse(rawRoom);
      if (!room) return;
      if (room.roomVisibility !== "public") return;
      if (!room.users || room.users.length === 0) return;
      if (room.auctionState && room.auctionState.auctionEnded) return;

      const availableTeams = Array.isArray(ALL_IPL_TEAMS)
        ? ALL_IPL_TEAMS.filter((team) => !room.teamsSelected?.includes(team))
        : [];

      publicRooms.push({
        roomId: room.roomId,
        auctionType: room.auctionType || "mega",
        teamsSelected: room.teamsSelected || [],
        availableTeams,
        totalTeamsJoined: (room.teamsSelected || []).length,
        totalTeamSlots: MAX_FRANCHISE_SLOTS,
        spacesMissing: MAX_FRANCHISE_SLOTS - ((room.teamsSelected || []).length),
        createdAt: room.createdAt || Date.now(),
      });
    });

    return publicRooms
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 50);
  } catch (error) {
    console.error("Error in getAllPublicRooms:", error);
    return [];
  }
};

const getPublicRoomsCount = async () => {
  try {
    if (!redisClient) return 0;
    const allData = await redisClient.hgetall(ROOMS_REDIS_KEY);
    let count = 0;
    Object.values(allData).forEach((rawRoom) => {
      const room = JSON.parse(rawRoom);
      if (!room) return;
      if (room.roomVisibility !== "public") return;
      if (!room.users || room.users.length === 0) return;
      if (room.auctionState && room.auctionState.auctionEnded) return;
      count++;
    });
    return count;
  } catch (error) {
    console.error("Error in getPublicRoomsCount:", error);
    return 0;
  }
};

const changeTeam = async ({ roomId, userId, newTeam }) => {
  const normalizedRoomId = roomId.toUpperCase();
  const room = await loadRoom(normalizedRoomId);
  if (!room) return { error: "Room not found" };

  const userIndex = room.users.findIndex((u) => u.userId === userId);
  if (userIndex === -1) return { error: "User not found in room" };

  const user = room.users[userIndex];
  if (!user.isSpectator) return { error: "Only spectators can pick a team" };

  if (room.teamsSelected.includes(newTeam)) return { error: "Team is already taken" };

  if (!ALL_IPL_TEAMS.includes(newTeam)) return { error: "Invalid team selected" };

  user.team = newTeam;
  user.isSpectator = false;

  room.teamsSelected.push(newTeam);

  // If the admin user left while this spectator was picking a team, this spectator could become admin
  if (!room.users.some(u => u.userId === room.adminUserId)) {
    room.adminUserId = pickNextAdminUserId(room);
  }

  await saveRoom(room);
  return { success: true, room };
};


module.exports = {
  MAX_USERS_PER_ROOM,
  MAX_FRANCHISE_SLOTS,
  MAX_SPECTATORS,
  SPECTATOR_TEAM,
  INITIAL_TEAM_PURSE_MEGA,
  INITIAL_TEAM_PURSE_MINI,
  getInitialPurseByAuctionType,
  createRoom,
  getRoom,
  removeRoom,
  joinRoom,
  leaveRoom,
  serializeRoom,
  isFranchiseFull,
  countSpectators,
  kickUser,
  getAllPublicRooms,
  getPublicRoomsCount,
  changeTeam,
  ALL_IPL_TEAMS,
  saveRoom,
  loadRoom,
  setRedisClient,
};
