const path = require("path");

const DATASET_PATH = path.resolve(__dirname, "../../data/players.json");
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 400;

const VALID_ROLES = new Set([
  "Batsman",
  "Fast Bowler",
  "Spinner",
  "All-rounder",
  "Wicketkeeper",
]);

const VALID_CATEGORIES = new Set(["Marquee", "Capped", "Uncapped"]);

const SET_ORDER = [
  "Marquee Players",
  "Batsmen",
  "Fast Bowlers",
  "Spinners",
  "All Rounders",
  "Wicket Keepers",
  "Uncapped Players",
  "Unsold Players",
];

const SET_NAME_ALIASES = {
  "Marquee": "Marquee Players",
  "Marquee Players": "Marquee Players",
  "All Rounders": "All Rounders",
  "All-rounders": "All Rounders",
  "AllRounders": "All Rounders",
  "Wicket Keepers": "Wicket Keepers",
  "WicketKeepers": "Wicket Keepers",
  "Uncapped": "Uncapped Players",
  "Uncapped Players": "Uncapped Players",
  "Uncapped players": "Uncapped Players",
  "Unsold": "Unsold Players",
  "Unsold Players": "Unsold Players",
  "Unsold players": "Unsold Players",
  Capped: null,
};

const roleToSetKey = {
  Batsman: "Batsmen",
  "Fast Bowler": "Fast Bowlers",
  Spinner: "Spinners",
  "All-rounder": "All Rounders",
  "AllRounder": "All Rounders",
  Wicketkeeper: "Wicket Keepers",
};

/** Short / legacy role tokens → canonical roles (for relaxed loads / small datasets). */
const RELAXED_ROLE_ALIASES = {
  BAT: "Batsman",
  BATSMAN: "Batsman",
  FB: "Fast Bowler",
  FASTBOWLER: "Fast Bowler",
  "FAST BOWLER": "Fast Bowler",
  PACE: "Fast Bowler",
  PACER: "Fast Bowler",
  SEAM: "Fast Bowler",
  SEAMER: "Fast Bowler",
  SP: "Spinner",
  SPINNER: "Spinner",
  SPIN: "Spinner",
  OB: "Spinner",
  OFFBREAK: "Spinner",
  "OFF BREAK": "Spinner",
  LB: "Spinner",
  LEGBREAK: "Spinner",
  "LEG BREAK": "Spinner",
  AR: "All-rounder",
  ALLROUNDER: "All-rounder",
  "ALL-ROUNDER": "All-rounder",
  WK: "Wicketkeeper",
  WICKETKEEPER: "Wicketkeeper",
  KEEPER: "Wicketkeeper",
};

const normalizePlayer = (player, index) => ({
  id: player.id ?? index + 1,
  name: (player.name || "").trim(),
  country: (player.country || "").trim() || "India",
  role: (player.role || "").trim(),
  basePrice: Number(player.basePrice),
  set: (player.set || "").trim() || "Uncategorized",
});

const normalizePlayerRelaxed = (player, index) => {
  const rawRole = (player.role || "Batsman").toString().trim();
  const upper = rawRole.toUpperCase().replace(/\s+/g, "");
  const mapped =
    RELAXED_ROLE_ALIASES[upper] ||
    RELAXED_ROLE_ALIASES[rawRole] ||
    (VALID_ROLES.has(rawRole) ? rawRole : null);
  const role = mapped || "Batsman";

  let basePrice = Number(player.basePrice);
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    basePrice = 0.5;
  }
  // Express in Cr if huge values look like rupees (optional heuristic)
  if (basePrice > 1000) {
    basePrice = Math.round((basePrice / 1e7) * 100) / 100;
    if (basePrice <= 0) basePrice = 0.5;
  }

  return {
    id: player.id ?? index + 1,
    name: (player.name || `Player ${index + 1}`).trim(),
    country: (player.country || "").trim() || "India",
    role,
    basePrice,
    set: (player.set || "").trim() || "Uncategorized",
  };
};

const validatePlayer = (player) => {
  if (!player.name) return "Missing name";
  if (!player.country) return "Missing country";
  if (!VALID_ROLES.has(player.role)) return `Invalid role: ${player.role}`;
  if (!Number.isFinite(player.basePrice) || player.basePrice <= 0) {
    return `Invalid basePrice for ${player.name}`;
  }
  if (!player.set) return `Missing set for ${player.name}`;
  return null;
};

const validatePlayerRelaxed = (player, index) => {
  if (!player.name || !String(player.name).trim()) {
    return `Player index ${index}: Missing name`;
  }
  return null;
};

const validateDataset = (players) => {
  if (!Array.isArray(players)) {
    throw new Error("players.json must contain an array");
  }

  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Dataset must have ${MIN_PLAYERS}-${MAX_PLAYERS} players (got ${players.length})`
    );
  }

  const seenNames = new Set();
  for (let i = 0; i < players.length; i += 1) {
    const player = normalizePlayer(players[i], i);
    const validationError = validatePlayer(player);
    if (validationError) {
      throw new Error(`Player index ${i}: ${validationError}`);
    }

    const nameKey = player.name.toLowerCase();
    if (seenNames.has(nameKey)) {
      throw new Error(`Duplicate player name detected: ${player.name}`);
    }
    seenNames.add(nameKey);
  }
};

const validateDatasetRelaxed = (players) => {
  if (!Array.isArray(players)) {
    throw new Error("players.json must contain an array");
  }
  // Allow empty pools for building gradually
  if (players.length < 0) {
    throw new Error("Need at least 1 player in players.json to start an auction");
  }
  const seenNames = new Set();
  for (let i = 0; i < players.length; i += 1) {
    const np = normalizePlayerRelaxed(players[i], i);
    const err = validatePlayerRelaxed(np, i);
    if (err) throw new Error(err);
    const nameKey = np.name.toLowerCase();
    if (seenNames.has(nameKey)) {
      throw new Error(`Duplicate player name detected: ${nameKey}`);
    }
    seenNames.add(nameKey);
  }
};

const shuffleArray = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const normalizeSetName = (setName, role) => {
  const normalized = (setName || "").trim();
  if (SET_NAME_ALIASES.hasOwnProperty(normalized)) {
    return SET_NAME_ALIASES[normalized];
  }
  if (normalized === "" || normalized === "Uncategorized") {
    return "Uncapped Players";
  }
  if (normalized === "Capped") {
    // Capped players should be routed by role
    return roleToSetKey[role] || "Batsmen";
  }
  if (normalized === "Uncategorized" || normalized === "") {
    return "Uncapped Players";
  }
  return normalized;
};

const buildAuctionSets = (players) => {
  // Group players by their normalized 'set' field
  const setMap = {};

  for (const player of players) {
    const setName = normalizeSetName(player.set, player.role) || "Uncapped Players";
    if (!setMap[setName]) {
      setMap[setName] = [];
    }
    setMap[setName].push(player);
  }

  // Use configured SET_ORDER to maintain set sequence
  const sets = SET_ORDER.map((setName) => {
    const rawPlayers = setMap[setName] ? shuffleArray(setMap[setName]) : [];
    const players = rawPlayers.map((player) => ({
      ...player,
      status: player.status || "PENDING",
    }));
    return {
      setName,
      players,
      // Preserve fixed totals for UI; should never change during auction.
      totalPlayers: players.length,
      originalTotalPlayers: players.length,
      // Auction picks use availablePlayers so players listing stays constant.
      availablePlayers: [...players],
    };
  });

  // Order is fixed via SET_ORDER; keep all sets showing even if empty.
  return sets;
};

const loadPlayers = (options = {}) => {
  let players = [];
  const datasetPath = options.auctionType === 'mini' ? path.resolve(__dirname, "../../data/mini_players.json") : DATASET_PATH;

  try {
    const fs = require("fs");
    const raw = fs.readFileSync(datasetPath, "utf8");
    const cleanedRaw = raw.replace(/^\uFEFF/, "").trim();
    players = cleanedRaw.length > 0 ? JSON.parse(cleanedRaw) : [];
    console.log(`[DATASET] Loaded ${players.length} players from ${datasetPath}`);
  } catch (error) {
    console.warn(
      `Could not load players.json (${DATASET_PATH}), starting with empty dataset:`,
      error.message
    );
    players = [];
  }

  const relaxed = options.relaxed === true;
  if (relaxed) {
    console.log(`[DATASET] Using relaxed validation for ${players.length} players`);
    validateDatasetRelaxed(players);
    return players.map((p, i) => normalizePlayerRelaxed(p, i));
  }

  console.log(`[DATASET] Using strict validation for ${players.length} players`);
  validateDataset(players);
  return players.map(normalizePlayer);
};

const loadAuctionSets = (options = {}) => {
  const players = loadPlayers(options);

  // Group players by their normalized 'set' field
  const setMap = {};

  for (const player of players) {
    const setName = normalizeSetName(player.set, player.role) || "Uncapped Players";
    if (!setMap[setName]) {
      setMap[setName] = [];
    }
    setMap[setName].push(player);
  }

  console.log(`[DATASET] Set map created:`, Object.keys(setMap).map(key => `${key}: ${setMap[key].length} players`));

  // Use configured SET_ORDER to maintain set sequence
  const sets = SET_ORDER.map((setName) => {
    const playersForSet = setMap[setName] || [];
    const shuffled = shuffleArray(playersForSet);
    const players = shuffled.map((player) => ({
      ...player,
      status: player.status || "PENDING",
    }));
    console.log(`[DATASET] Set "${setName}": ${playersForSet.length} players, first 3 after shuffle: ${players.slice(0, 3).map(p => p.name).join(", ")}`);
    return {
      setName,
      players,
      totalPlayers: playersForSet.length,
      originalTotalPlayers: playersForSet.length,
      availablePlayers: [...players],
    };
  });

  console.log(`[DATASET] Sets created in order:`, sets.map(s => `${s.setName} (${s.players.length} players)`));

  return {
    totalPlayers: players.length,
    totalSets: sets.length,
    sets,
  };
};

/**
 * Try strict IPL-sized dataset; if that fails, load a relaxed dataset so the host
 * can still run an auction with a small or legacy players.json.
 */
const loadAuctionSetsForStart = (options = {}) => {
  try {
    console.log(`[DATASET] Attempting strict validation...`);
    const result = loadAuctionSets({ relaxed: false, ...options });
    console.log(`[DATASET] Strict validation succeeded. Total players: ${result.totalPlayers}, Total sets: ${result.totalSets}`);
    return result;
  } catch (error) {
    console.log(`[DATASET] Strict validation failed: ${error.message}. Falling back to relaxed...`);
    const result = loadAuctionSets({ relaxed: true, ...options });
    console.log(`[DATASET] Relaxed mode loaded. Total players: ${result.totalPlayers}, Total sets: ${result.totalSets}`);
    return result;
  }
};

module.exports = {
  roleToSetKey,
  loadPlayers,
  buildAuctionSets,
  loadAuctionSets,
  loadAuctionSetsForStart,
  shuffleArray,
};
