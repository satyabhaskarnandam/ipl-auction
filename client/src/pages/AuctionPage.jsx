
import SpectatorTeamSelect from "../components/SpectatorTeamSelect";
import ShareMenu from "../components/ShareMenu";
import ScrollWrapper from "../components/ScrollWrapper";
import { auctionSounds } from "../lib/auctionSounds";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import ChatPanel from "../components/ChatPanel";
import PlayerCard from "../components/PlayerCard";
import PlayerPoolPanel from "../components/PlayerPoolPanel";
import SettingsPanel from "../components/SettingsPanel";
import WarningPopup from "../components/WarningPopup";
import AnimatedScoreStars from "../components/AnimatedScoreStars";
import { formatAmount } from "../lib/formatAmount";
import { calculateTeamRating } from "../lib/teamRatingCalculator";
import { SERVER_URL, socket } from "../lib/socket";
import { IPL_TEAMS } from "../data/teams";
import { MINI_SQUAD_PRESETS } from "../data/miniSquads";
import { handleCapture } from "../lib/captureUtils";

// --- PREMIUM EVENT SOUNDS ---
const soldSound = typeof window !== "undefined" && typeof Audio !== "undefined" ? new Audio("/sounds/sold-celebration.mp3") : null;
const unsoldSound = typeof window !== "undefined" && typeof Audio !== "undefined" ? new Audio("/sounds/unsold-sad.mp3") : null;

const DEFAULT_VOL_SOLD = 0.6;
const DEFAULT_VOL_UNSOLD = 0.5;
if (soldSound) soldSound.volume = DEFAULT_VOL_SOLD;
if (unsoldSound) unsoldSound.volume = DEFAULT_VOL_UNSOLD;

const activeFades = { sold: null, unsold: null };

function playPremiumEventSound(audioEl, options = {}) {
  if (auctionSounds._MUTED || !audioEl) return;
  try {
    if (audioEl === soldSound && activeFades.sold) { clearInterval(activeFades.sold); activeFades.sold = null; audioEl.volume = DEFAULT_VOL_SOLD; }
    if (audioEl === unsoldSound && activeFades.unsold) { clearInterval(activeFades.unsold); activeFades.unsold = null; audioEl.volume = DEFAULT_VOL_UNSOLD; }
    
    // Safety volume reset
    if (audioEl === soldSound) audioEl.volume = DEFAULT_VOL_SOLD;
    if (audioEl === unsoldSound) audioEl.volume = DEFAULT_VOL_UNSOLD;

    audioEl.pause();
    
    let startOffset = 0;
    if (options.useLastTwoSeconds && Number.isFinite(audioEl.duration) && audioEl.duration > 2) {
      startOffset = audioEl.duration - 2;
    }
    
    audioEl.currentTime = startOffset;
    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (err) {
    // Ignore autoplay or DOM exceptions
  }
}

function fadeOutSound(audioEl, defaultVol, fadeKey) {
  if (!audioEl || audioEl.paused) return;
  if (activeFades[fadeKey]) clearInterval(activeFades[fadeKey]);
  
  const fadeDuration = 300; // ms
  const fadeSteps = 15;
  const stepTime = fadeDuration / fadeSteps;
  const startVol = audioEl.volume;
  const volStep = startVol / fadeSteps;
  let currentStep = 0;
  
  activeFades[fadeKey] = setInterval(() => {
    currentStep++;
    const nextVol = startVol - (volStep * currentStep);
    if (nextVol <= 0 || currentStep >= fadeSteps) {
      clearInterval(activeFades[fadeKey]);
      activeFades[fadeKey] = null;
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.volume = defaultVol; // reset for next play
    } else {
      audioEl.volume = nextVol;
    }
  }, stepTime);
}

function stopPremiumEventSounds() {
  try {
    fadeOutSound(soldSound, DEFAULT_VOL_SOLD, 'sold');
    fadeOutSound(unsoldSound, DEFAULT_VOL_UNSOLD, 'unsold');
  } catch (err) {}
}

// --- MINI AUCTION AUTO SCORE ENGINE V2 ---
const MINI_PLAYER_RATINGS = {
  "Virat Kohli": 9.5, "Jasprit Bumrah": 9.8, "Suryakumar Yadav": 9.5,
  "Josh Hazlewood": 8.8, "Bhuvneshwar Kumar": 8.4, "Hardik Pandya": 9.0,
  "Rashid Khan": 9.5, "Sunil Narine": 9.0, "Andre Russell": 9.0,
  "Mitchell Starc": 9.0, "Rohit Sharma": 9.2, "MS Dhoni": 8.5,
  "Trent Boult": 8.8, "Kagiso Rabada": 8.7, "Yash Dayal": 8.0,
  "Heinrich Klaasen": 9.5, "Travis Head": 9.2, "Nicholas Pooran": 9.0,
  "Rishabh Pant": 9.0, "Pat Cummins": 9.0, "Yashaswi Jaiswal": 9.0,
  "Sanju Samson": 8.8, "Shubman Gill": 9.0, "KL Rahul": 8.5,
  "Ruturaj Gaikwad": 8.7, "Axar Patel": 8.8, "Kuldeep Yadav": 8.8,
  "Arshdeep Singh": 8.7, "Matheesha Pathirana": 8.8, "Rinku Singh": 8.5
};

const MINI_ROLE_RATING = {
  batsman: 7.0,
  bowler: 7.0,
  allrounder: 7.5,
  wicketkeeper: 7.0,
};

const KNOWN_MINI_ROLES = {
  "Jasprit Bumrah": "bowler", "Matheesha Pathirana": "bowler", "Yash Dayal": "bowler",
  "Varun Chakravarthy": "bowler", "Harshit Rana": "bowler", "Vaibhav Arora": "bowler",
  "Pat Cummins": "bowler", "Bhuvneshwar Kumar": "bowler", "Kuldeep Yadav": "bowler",
  "Mukesh Kumar": "bowler", "Arshdeep Singh": "bowler", "Kagiso Rabada": "bowler",
  "Mitchell Starc": "bowler", "Md Shami": "bowler", "Mohammed Shami": "bowler",
  "Mohammad Siraj": "bowler", "Trent Boult": "bowler", "Yuzvendra Chahal": "bowler",
  "Sandeep Sharma": "bowler", "Rashid Khan": "bowler", "Mohsin Khan": "bowler",
  "Ravi Bishnoi": "bowler", "Mayank Yadav": "bowler", "Nuwan Thushara": "bowler",
  "Rasikh Dar": "bowler", "T. Natarajan": "bowler", "Avesh Khan": "bowler",
  "Prasidh Krishna": "bowler", "Khaleel Ahmed": "bowler", "Noor Ahmad": "bowler",
  "Nathan Ellis": "bowler", "Lockie Ferguson": "bowler", "Jofra Archer": "bowler",
  "Nandre Burger": "bowler", "Dushmantha Chameera": "bowler", "Deepak Chahar": "bowler",
  "Suyash Sharma": "bowler", "Umran Malik": "bowler", "Harshal Patel": "bowler",
  
  "Hardik Pandya": "allrounder", "Shivam Dube": "allrounder", "Krunal Pandya": "allrounder",
  "Sunil Narine": "allrounder", "Ramandeep Singh": "allrounder", "Abhishek Sharma": "allrounder",
  "Nitish Kumar Reddy": "allrounder", "Axar Patel": "allrounder", "Rahul Tewatia": "allrounder",
  "Washington Sundar": "allrounder", "Mitchell Santner": "allrounder", "Sam Curran": "allrounder",
  "Marcus Stoinis": "allrounder", "Marco Jansen": "allrounder", "Azmatullah Omarzai": "allrounder",
  "Ravindra Jadeja": "allrounder", "Will Jacks": "allrounder", "Riyan Parag": "allrounder",
  "Kieron Pollard": "allrounder", "Glenn Maxwell": "allrounder", "Moeen Ali": "allrounder",

  "MS Dhoni": "wicketkeeper", "Ishan Kishan": "wicketkeeper", "Sanju Samson": "wicketkeeper", "Nicholas Pooran": "wicketkeeper", "Jos Buttler": "wicketkeeper", "Tristan Stubbs": "wicketkeeper",
  "Phil Salt": "wicketkeeper", "Prabhsimran Singh": "wicketkeeper", "Dhruv Jurel": "wicketkeeper",
  "Abhishek Porel": "wicketkeeper", "Jitesh Sharma": "wicketkeeper", "Quinton de Kock": "wicketkeeper",
  "Jacob Bethell": "batsman", "Tim David": "batsman", "Abhinandan Singh": "bowler",
  "Rasikh Dar": "bowler", "Nuwan Thushara": "bowler", "Romario Shepherd": "allrounder",
  "Swapnil Singh": "allrounder", "Suyash Sharma": "bowler", "Harshit Rana": "allrounder",
  "Ramandeep Singh": "allrounder", "Angkrish Raghuvanshi": "batsman", "Ayush Mhatre": "batsman",
  "Heinrich Klaasen": "wicketkeeper", "Pat Cummins": "bowler", "Abhishek Sharma": "allrounder",
  "Travis Head": "batsman", "Nitish Kumar Reddy": "allrounder", "Shahbaz Ahmed": "allrounder",
  "Sunil Narine": "allrounder", "Andre Russell": "allrounder", "Varun Chakravarthy": "bowler",
  "Rinku Singh": "batsman", "Shreyas Iyer": "batsman", "Venkatesh Iyer": "allrounder",
  "Axar Patel": "allrounder", "Kuldeep Yadav": "bowler", "Rishabh Pant": "wicketkeeper",
  "KL Rahul": "wicketkeeper", "Tristan Stubbs": "wicketkeeper", "Jake Fraser-McGurk": "batsman",
  "Hardik Pandya": "allrounder", "Suryakumar Yadav": "batsman", "Rohit Sharma": "batsman",
  "Jasprit Bumrah": "bowler", "Ishan Kishan": "wicketkeeper", "Tilak Varma": "batsman",
  "Ravindra Jadeja": "allrounder", "MS Dhoni": "wicketkeeper", "Ruturaj Gaikwad": "batsman",
  "Matheesha Pathirana": "bowler", "Shivam Dube": "allrounder", "Rachin Ravindra": "allrounder",
  "Rashid Khan": "bowler", "Shubman Gill": "batsman", "Jos Buttler": "wicketkeeper",
  "Mohammad Siraj": "bowler", "Kagiso Rabada": "bowler", "Sai Sudharsan": "batsman",
  "Arshdeep Singh": "bowler", "Yuzvendra Chahal": "bowler", "Marcus Stoinis": "allrounder",
  "Shashank Singh": "batsman", "Prabhsimran Singh": "wicketkeeper", "Liam Livingstone": "allrounder",
  "Yashaswi Jaiswal": "batsman", "Sanju Samson": "wicketkeeper", "Riyan Parag": "allrounder",
  "Dhruv Jurel": "wicketkeeper", "Trent Boult": "bowler", "Avesh Khan": "bowler",
  "Nicholas Pooran": "wicketkeeper", "Mayank Yadav": "bowler", "Ravi Bishnoi": "bowler",
  "Quinton De Kock": "wicketkeeper", "Ayush Badoni": "allrounder", "Devdutt Padikkal": "batsman",
  "Digvesh Rathi": "bowler", "Prince Yadav": "bowler", "Manav Suthar": "bowler",
  "Manimaran Siddharth": "bowler", "Gurnoor Singh Brar": "bowler", "Vipraj Nigam": "allrounder",
  "Shubham Dubey": "batsman", "Himmat Singh": "batsman"
};

function normalizeMiniRole(player) {
  const cleanName = String(player?.name || "").replace(/\(T\)$/i,'').trim();
  const lowerName = cleanName.toLowerCase();
  
  const r = String(player?.role || "").toLowerCase().trim();
  if (r.includes("all-round") || r.includes("all round") || r.includes("allround") || r === "ar") return "allrounder";
  if (r.includes("wicket") || r.includes("keeper") || r === "wk") return "wicketkeeper";
  if (r.includes("bowler") || r.includes("fast") || r.includes("pacer") || r.includes("spinner") || r.includes("spin")) return "bowler";
  if (r.includes("batsman") || r.includes("batter") || r.includes("opener") || r.includes("top order") || r.includes("middle order")) return "batsman";
  
  if (KNOWN_MINI_ROLES[cleanName]) return KNOWN_MINI_ROLES[cleanName];
  
  return "batsman";
}

function getPlayerDisplayRole(player, metadataMap = {}) {
  const cleanName = String(player?.name || "").replace(/\(T\)$/i,'').trim();
  const lowerName = cleanName.toLowerCase();
  
  // PRIORITY 1: Metadata Map (Official Data)
  const meta = metadataMap[lowerName];
  if (meta && meta.role) {
    const rawRole = String(meta.role).toLowerCase();
    if (rawRole.includes("all-round") || rawRole.includes("all round") || rawRole.includes("allround") || rawRole === "ar") return "ALL-ROUNDER";
    if (rawRole.includes("wicket") || rawRole.includes("keeper") || rawRole === "wk") return "WICKETKEEPER";
    if (rawRole.includes("bowler") || rawRole.includes("fast") || rawRole.includes("pacer")) return "FAST BOWLER";
    if (rawRole.includes("spinner") || rawRole.includes("spin") || SPINNERS_LIST.some(s => lowerName.includes(s))) return "SPINNER";
    if (rawRole.includes("batsman") || rawRole.includes("batter")) return "BATSMAN";
  }

  // PRIORITY 2: Manual Heuristics (Fallback)
  const role = normalizeMiniRole(player);
  if (role === "bowler") {
     if (SPINNERS_LIST.some(s => lowerName.includes(s))) return "SPINNER";
     return "FAST BOWLER";
  }
  if (role === "wicketkeeper") return "WICKETKEEPER";
  if (role === "allrounder") return "ALL-ROUNDER";
  return "BATSMAN";
}

function getMiniPlayerRating(player, roleKey) {
  let rating = MINI_ROLE_RATING[roleKey] || 7.0;
  if (MINI_PLAYER_RATINGS[player?.name]) {
    rating = MINI_PLAYER_RATINGS[player.name];
  } else if (Number.isFinite(player?.rating) && player.rating > 0) {
    rating = player.rating;
  }
  return rating;
}

const SPINNERS_LIST = [
  "rashid", "narine", "chakravarthy", "kuldeep", "chahal", "bishnoi", "noor ahmad", "suyash", 
  "washington", "santner", "jadeja", "axar", "tewatia", "sai kishore", "suthar", "markande", 
  "krunal", "shahbaz", "swapnil", "abhishek sharma", "hasaranga", "zampa", "ashwin", 
  "shreyas gopal", "theekshana", "brar", "rahul chahar", "gowtham", "allah ghazanfar", 
  "kamindu mendis", "manimaran siddharth", "anukul roy", "harsh dubey", "zeeshan ansari",
  "digvesh rathi", "manav suthar", "siddharth", "rathi", "suthar"
];

const ELITE_FINISHERS = [
  "rinku singh", "andre russell", "ms dhoni", "heinrich klaasen", "tim david", 
  "marcus stoinis", "shimron hetmyer", "abdul samad", "ashutosh sharma", 
  "shashank singh", "rahul tewatia", "nicholas pooran", "nicolas pooran", "tristan stubbs", 
  "rovman powell", "hardik pandya", "shivam dube", "rishabh pant"
];

const ELITE_OPENERS = [
  "travis head", "yashaswi jaiswal", "rohit sharma", "abhishek sharma", 
  "ruturaj gaikwad", "shubman gill", "jos buttler", "phil salt", 
  "ishan kishan", "kl rahul", "david warner", "quinton de kock",
  "sanju samson", "virat kohli", "rachin ravindra"
];

const DEATH_SPECIALISTS = [
  "jasprit bumrah", "matheesha pathirana", "arshdeep singh", "mitchell starc", 
  "anrich nortje", "sandeep sharma", "pat cummins", "t. natarajan", 
  "bhuvneshwar kumar", "harshal patel", "trent boult", "kagiso rabada",
  "jofra archer", "mohammed shami", "md shami"
];

const POWERPLAY_SPECIALISTS = [
  "trent boult", "mitchell starc", "mohammed shami", "md shami", "mohammad siraj", 
  "bhuvneshwar kumar", "deepak chahar", "khaleel ahmed", "marco jansen", "arshdeep singh",
  "josh hazlewood", "tim southee", "lockie ferguson"
];


/** 
 * --- TEAM INSIGHTS ENGINE V8 ---
 * Generates unique analyst-style pros and cons per team based on squad composition.
 * Absolutely prevents duplicate phrasing across teams via the allInsights registry.
 */
function generateTeamInsights(players, teamId, allInsights = {}) {
  const result = { fullText: "Building squad... • Scouting bowlers • Pending updates • Needs depth", _rawPhrases: [] };
  if (!Array.isArray(players) || players.length === 0) return result;

  // 1. EXTRACT USED PHRASES
  const usedPhrases = new Set();
  Object.keys(allInsights).forEach(id => {
    if (id !== teamId && allInsights[id]?._rawPhrases) {
      allInsights[id]._rawPhrases.forEach(p => usedPhrases.add(p));
    }
  });

  const pickUnique = (bank, name) => {
    for (let tmpl of bank) {
      if (!usedPhrases.has(tmpl)) {
        usedPhrases.add(tmpl);
        result._rawPhrases.push(tmpl);
        return tmpl.replace("%n", name);
      }
    }
    const fallback = bank[0];
    result._rawPhrases.push(fallback);
    return fallback.replace("%n", name);
  };

  // 2. ANALYZE SQUAD
  let openers = [], middleOrder = [], finishers = [], wicketkeepers = [];
  let pacers = [], spinners = [], deathSpecialists = [], ppSpecialists = [], allRounders = [];
  
  players.forEach(p => {
    const roleKey = normalizeMiniRole(p);
    const lowerName = p.name.toLowerCase();

    if (roleKey === "batsman" || roleKey === "wicketkeeper" || roleKey === "allrounder") {
      if (ELITE_OPENERS.some(s => lowerName.includes(s))) openers.push(p);
      else if (ELITE_FINISHERS.some(s => lowerName.includes(s))) finishers.push(p);
      else middleOrder.push(p);
      if (roleKey === "wicketkeeper") wicketkeepers.push(p);
    }
    if (roleKey === "bowler" || roleKey === "allrounder") {
      if (SPINNERS_LIST.some(s => lowerName.includes(s))) spinners.push(p);
      else if (roleKey === "bowler") pacers.push(p);
      
      if (DEATH_SPECIALISTS.some(s => lowerName.includes(s))) deathSpecialists.push(p);
      if (POWERPLAY_SPECIALISTS.some(s => lowerName.includes(s))) ppSpecialists.push(p);
    }
    if (roleKey === "allrounder") allRounders.push(p);
  });

  const sortFn = (a, b) => {
    const valA = a.price || a.soldPrice || a.basePrice || a.rating || 0;
    const valB = b.price || b.soldPrice || b.basePrice || b.rating || 0;
    return valB - valA;
  };
  openers.sort(sortFn);
  finishers.sort(sortFn);
  middleOrder.sort(sortFn);
  spinners.sort(sortFn);
  pacers.sort(sortFn);
  deathSpecialists.sort(sortFn);
  ppSpecialists.sort(sortFn);

  const topName = (arr) => arr[0]?.name.split('(')[0].trim();

  // 3. BATTING PRO DETECTION
  let batPro = "Developing core";
  let batStrength = "none";
  if (openers.length > 0) {
    batPro = pickUnique([
      "Firepower up top via %n", "Explosive opening led by %n", "Elite top-order featuring %n", "Strong start guaranteed by %n", "Formidable openers spearheaded by %n", "Dynamic top-order anchored by %n", "Aggressive opening stance with %n"
    ], topName(openers));
    batStrength = "openers";
  } else if (finishers.length > 0) {
    batPro = pickUnique([
      "Clutch finishing via %n", "Death overs hitting from %n", "Reliable finishing anchored by %n", "Dangerous endgame power via %n", "Lower-order explosion led by %n", "Match-winning finishing by %n", "Elite death-overs striking from %n"
    ], topName(finishers));
    batStrength = "finishers";
  } else if (middleOrder.length >= 2) {
    batPro = pickUnique([
      "Stable middle-order featuring %n", "Solid batting spine anchored by %n", "Resilient middle core led by %n", "Deep middle batting with %n", "Middle-order control headed by %n", "Reliable batting anchors including %n", "Batting core stability from %n"
    ], topName(middleOrder));
    batStrength = "middle";
  } else if (players.length >= 2) {
    batPro = pickUnique([
      "Building batting core around %n", "Developing batting depth via %n", "Core batting options featuring %n", "Top-order focus anchored by %n"
    ], players[0].name.split('(')[0].trim());
  }

  // 4. BOWLING PRO DETECTION
  let bowlPro = "Scouting bowlers";
  let bowlStrength = "none";
  
  const potentialBowlingPros = [];
  
  if (ppSpecialists.length > 0) {
    potentialBowlingPros.push({
      type: "powerplay",
      name: topName(ppSpecialists),
      bank: [
        "Powerplay mastery led by %n", "Early breakthroughs from %n", "Strong opening spells via %n", "Swing-bowling threat from %n", "Elite powerplay control with %n", "Dangerous upfront through %n", "New-ball specialist: %n"
      ],
      score: ppSpecialists[0].soldPrice || ppSpecialists[0].price || 10
    });
  }
  
  if (deathSpecialists.length > 0) {
    potentialBowlingPros.push({
      type: "death",
      name: topName(deathSpecialists),
      bank: [
        "Elite death control led by %n", "Death-overs mastery from %n", "Endgame restriction commanded by %n", "Reliable death bowling anchored by %n", "Clutch death bowling via %n", "Death overs locked down by %n", "Strong death-overs presence with %n", "Pinpoint yorkers from %n"
      ],
      score: deathSpecialists[0].soldPrice || deathSpecialists[0].price || 11
    });
  }
  
  if (spinners.length >= 2) {
    potentialBowlingPros.push({
      type: "spin",
      name: topName(spinners),
      bank: [
        "Tricky spin variety spearheaded by %n", "Strong spin attack led by %n", "Quality spin core anchored by %n", "Spin mastery commanded by %n", "Formidable spin options featuring %n", "Middle-overs spin control from %n", "Elite spin web led by %n", "Unreadable spin variety through %n"
      ],
      score: spinners[0].soldPrice || spinners[0].price || 9
    });
  }
  
  if (pacers.length >= 2) {
    potentialBowlingPros.push({
      type: "pace",
      name: topName(pacers),
      bank: [
        "Deep pace battery spearheaded by %n", "Strong seam attack led by %n", "Express pace options featuring %n", "Fast-bowling core anchored by %n", "Quality seam bowling from %n", "Formidable pace attack with %n", "Pace variety commanded by %n", "Relentless pace battery led by %n"
      ],
      score: pacers[0].soldPrice || pacers[0].price || 8
    });
  }
  
  if (potentialBowlingPros.length > 0) {
    // Pick the best strength or rotate based on teamId
    // Adding a team-specific offset to diversification
    const offset = (teamId.length + (teamId.charCodeAt(0) || 0)) % potentialBowlingPros.length;
    const selected = potentialBowlingPros[offset];
    bowlPro = pickUnique(selected.bank, selected.name);
    bowlStrength = selected.type; 
  } else if (players.some(p => normalizeMiniRole(p) === "bowler")) {
    const primaryBowler = players.find(p => normalizeMiniRole(p) === "bowler").name.split('(')[0].trim();
    bowlPro = pickUnique([
      "Building bowling attack around %n", "Developing core bowlers featuring %n", "Scouting bowling options led by %n", "Pace & spin dynamics anchored by %n"
    ], primaryBowler);
  }

  // 5. BATTING CON DETECTION
  let batCon = "Minor batting gaps";
  if (finishers.length === 0 && batStrength !== "finishers") {
    batCon = pickUnique([
      "Lacks finishing power", "Death scoring gaps", "Missing elite finisher", "Thin at the death", "Vulnerable finishing", "No dedicated finisher", "Endgame batting concerns"
    ], "");
  } else if (openers.length < 2 && players.length >= 3 && batStrength !== "openers") {
    batCon = pickUnique([
      "Fragile top order", "Thin opening depth", "Vulnerable upfront", "Opening gaps", "Lacks top-order stability", "Needs opening support", "Unstable opening-spine"
    ], "");
  } else if (middleOrder.length < 2 && players.length >= 3 && batStrength !== "middle") {
    batCon = pickUnique([
      "Thin middle depth", "Unstable middle-core", "Middle-order gaps", "Vulnerable batting-spine", "Lacks batting anchors", "Middle overs vulnerability", "Exposure in middle order"
    ], "");
  }

  // 6. BOWLING CON DETECTION
  let bowlCon = "Minor bowling gaps";
  if (spinners.length < 2 && players.length >= 4 && bowlStrength !== "spin") {
    bowlCon = pickUnique([
      "Lacks spin variety", "Thin spin attack", "Vulnerable spin-overs", "Spin support gaps", "Missing frontline spinner", "Exposed in middle-overs", "Weak spin depth"
    ], "");
  } else if (deathSpecialists.length === 0 && players.length >= 4 && bowlStrength !== "death") {
    bowlCon = pickUnique([
      "Death bowling concerns", "Weak death specialists", "Limited death control", "Vulnerable death-depth", "Missing death bowler", "Exposed at the death", "Endgame bowling gaps"
    ], "");
  } else if (pacers.length < 3 && players.length >= 4 && bowlStrength !== "pace") {
    bowlCon = pickUnique([
      "Thin pace battery", "Limited seam options", "Vulnerable pace-attack", "Lacks pace depth", "Missing frontline pacer", "Weak fast-bowling cover", "Pace support needed"
    ], "");
  }

  result.fullText = `${batPro} • ${bowlPro} • ${batCon} • ${bowlCon}`;
  return result;
}

function calculateMiniTeamScore(players, teamId = "Unknown") {
  let battingCount = 0, wkCount = 0, arCount = 0, bowlingCount = 0;
  let battingSum = 0, battingWeight = 0;
  let bowlingSum = 0, bowlingWeight = 0;
  
  let pacers = 0, spinners = 0, deathBowlers = 0, finishers = 0, solidMiddleOrder = 0;
  let hasEliteFinisher = false, hasEliteOpener = false, hasDeathSpecialist = false;
  
  let bestBatterName = "", highestBatRating = 0;
  let bestBowlerName = "", highestBowlRating = 0;
  let leadOpenerName = "", highestOpenerRating = 0;
  let leadFinisherName = "", highestFinisherRating = 0;
  let deathSpearheadName = "", highestDeathRating = 0;

  players.forEach((p) => {
    const roleKey = normalizeMiniRole(p);
    
    // STRICT RULE: No variance or bonuses from price. Use only the base rating.
    let rating = getMiniPlayerRating(p, roleKey);
    
    if (roleKey === "batsman" || roleKey === "wicketkeeper" || roleKey === "allrounder") {
      if (rating >= 7.5) solidMiddleOrder++;
    }
    
    const lowerName = p.name.toLowerCase().trim();
    const isSpinner = SPINNERS_LIST.some(s => lowerName.includes(s));
    const isEliteFinisher = ELITE_FINISHERS.some(s => lowerName.includes(s));
    const isEliteOpener = ELITE_OPENERS.some(s => lowerName.includes(s));
    const isDeathSpecialist = DEATH_SPECIALISTS.some(s => lowerName.includes(s));

    if (isEliteFinisher) {
      hasEliteFinisher = true;
      finishers++;
    }
    if (isEliteOpener) hasEliteOpener = true;
    if (isDeathSpecialist) hasDeathSpecialist = true;

    if (roleKey === "batsman" || roleKey === "wicketkeeper" || roleKey === "allrounder") {
      if (rating > highestBatRating) {
        highestBatRating = rating;
        bestBatterName = p.name.split('(')[0].trim();
      }
      if (isEliteOpener && rating > highestOpenerRating) {
        highestOpenerRating = rating;
        leadOpenerName = p.name.split('(')[0].trim();
      }
      if (isEliteFinisher && rating > highestFinisherRating) {
        highestFinisherRating = rating;
        leadFinisherName = p.name.split('(')[0].trim();
      }
    }

    if (roleKey === "bowler" || roleKey === "allrounder") {
      if (rating > highestBowlRating) {
        highestBowlRating = rating;
        bestBowlerName = p.name.split('(')[0].trim();
      }
      if (isDeathSpecialist && rating > highestDeathRating) {
        highestDeathRating = rating;
        deathSpearheadName = p.name.split('(')[0].trim();
      }
    }

    // Weighting logic (strictly 1.0 weight for proper evaluation)
    if (roleKey === "batsman") {
      battingSum += rating * 1.0;
      battingWeight += 1.0;
      battingCount++;
    } else if (roleKey === "wicketkeeper") {
      battingSum += rating * 1.0;
      battingWeight += 1.0;
      wkCount++;
    } else if (roleKey === "allrounder") {
      battingSum += rating * 1.0;
      battingWeight += 1.0;
      bowlingSum += rating * 1.0;
      bowlingWeight += 1.0;
      arCount++;
      if (isSpinner) spinners++; else pacers++;
    } else if (roleKey === "bowler") {
      bowlingSum += rating * 1.0;
      bowlingWeight += 1.0;
      bowlingCount++;
      if (isSpinner) spinners++;
      else {
        pacers++;
        if (rating >= 8.0) deathBowlers++;
      }
    }
  });

  const pureBatters = battingCount + wkCount;
  const battingOptions = pureBatters + arCount;
  const bowlingOptions = bowlingCount + arCount;

  // STEP 1 - BASE SCORES
  // Map typical 0-10 player ratings down to the 0-5 scale
  let avgBatting = battingWeight > 0 ? (battingSum / battingWeight) : 0;
  let baseBattingScore = avgBatting > 0 ? avgBatting / 2 : 0;

  let avgBowling = bowlingWeight > 0 ? (bowlingSum / bowlingWeight) : 0;
  let baseBowlingScore = avgBowling > 0 ? avgBowling / 2 : 0;
  
  // Clamp base scores immediately to 0-5
  baseBattingScore = Math.max(0, Math.min(5, baseBattingScore));
  baseBowlingScore = Math.max(0, Math.min(5, baseBowlingScore));

  // STEP 2 - PENALTIES ONLY
  let batPenalty = 0;
  // BATTING PENALTIES
  // - no proper finisher
  if (!hasEliteFinisher && finishers < 1) batPenalty += 0.10; // moderate weakness
  // - top-order dependency
  if (solidMiddleOrder < 2 && pureBatters >= 2) batPenalty += 0.10; // moderate weakness
  // - slightly thin lower order
  if (battingOptions < 6) batPenalty += 0.05; // minor weakness
  // - weak batting bench
  if (pureBatters < 4) batPenalty += 0.05; // minor weakness

  // Severe depth issues override
  if (battingOptions <= 3) batPenalty += 0.15; // major weakness

  // Penalty per department must never exceed 0.15
  batPenalty = Math.max(0, Math.min(0.15, batPenalty));
  
  let bowlPenalty = 0;
  // BOWLING PENALTIES
  // - limited spin variety
  if (spinners < 1) bowlPenalty += 0.10; // moderate weakness
  // - slightly weak death support
  if (!hasDeathSpecialist && deathBowlers < 1) bowlPenalty += 0.10; // moderate weakness
  // - thin bowling bench
  if (bowlingOptions < 5) bowlPenalty += 0.05; // minor weakness
  // - pace-heavy imbalance
  if (pacers >= 3 && spinners === 0) bowlPenalty += 0.05; // minor weakness

  // Severe depth issues override
  if (bowlingOptions <= 3) bowlPenalty += 0.15; // major weakness

  // Penalty per department must never exceed 0.15
  bowlPenalty = Math.max(0, Math.min(0.15, bowlPenalty));

  let totalPenalty = batPenalty + bowlPenalty;

  // STEP 3 - FINAL FORMULA
  let battingFinal = baseBattingScore - batPenalty;
  let bowlingFinal = baseBowlingScore - bowlPenalty;
  let overallScore = (battingFinal + bowlingFinal) / 2;

  // STEP 5 - SAFETY RULES (Clamp)
  battingFinal = Math.max(0, Math.min(5, battingFinal));
  bowlingFinal = Math.max(0, Math.min(5, bowlingFinal));
  overallScore = Math.max(0, Math.min(5, overallScore));

  // STEP 4 - ROUNDING
  overallScore = Number(overallScore.toFixed(2));
  let finalBatting = Number(battingFinal.toFixed(2));
  let finalBowling = Number(bowlingFinal.toFixed(2));
  
  // Phase 8: Detailed Squad Analysis (Analyst Tags)
  let batTag = { type: "default", value: "" };
  if (leadOpenerName) batTag = { type: "top_order", value: leadOpenerName };
  else if (leadFinisherName) batTag = { type: "finisher", value: leadFinisherName };
  else if (bestBatterName && highestBatRating >= 8.5) batTag = { type: "middle_order", value: bestBatterName };
  else if (battingOptions >= 5) batTag = { type: "depth", value: battingOptions };

  let bowlTag = { type: "default", value: "" };
  if (deathSpearheadName) bowlTag = { type: "death", value: deathSpearheadName };
  else if (bestBowlerName && highestBowlRating >= 8.5) bowlTag = { type: "lead", value: bestBowlerName };
  else if (spinners >= 2) bowlTag = { type: "spin", value: spinners };
  else if (pacers >= 2) bowlTag = { type: "pace", value: pacers };

  let batConTag = { type: "default", value: "" };
  if (pureBatters < 3 && players.length >= 3) batConTag = { type: "top_order", value: pureBatters };
  else if (solidMiddleOrder < 3 && players.length >= 5) batConTag = { type: "middle_order", value: solidMiddleOrder };
  else if (!hasEliteFinisher && solidMiddleOrder < 2 && players.length >= 6) batConTag = { type: "finisher", value: "" };
  else if (battingOptions < 6 && players.length >= 8) batConTag = { type: "depth", value: battingOptions };

  let bowlConTag = { type: "default", value: "" };
  if (pacers < 2 && players.length >= 3) bowlConTag = { type: "pace", value: pacers };
  else if (spinners < 1 && players.length >= 3) bowlConTag = { type: "spin", value: "" };
  else if (deathBowlers < 1 && players.length >= 4) bowlConTag = { type: "death", value: "" };
  else if (bowlingOptions < 5 && players.length >= 5) bowlConTag = { type: "depth", value: bowlingOptions };

  return { 
    batting: finalBatting, 
    bowling: finalBowling, 
    overall: overallScore, 
    totalPenalties: Number(totalPenalty.toFixed(2)),
    analystTags: {
      batting_pros: batTag,
      bowling_pros: bowlTag,
      batting_cons: batConTag,
      bowling_cons: bowlConTag
    }
  };
}

const SESSION_KEY = "ipl-auction-session";
const ENDED_SNAPSHOT_PREFIX = "ipl-auction-ended-snapshot";
const teamById = Object.fromEntries(IPL_TEAMS.map((t) => [t.id, t]));
const TEAM_FULL_NAMES = {
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

const BID_DEBOUNCE_MS = 80;
const PLAYER_ENTRY_DURATION_MS = 900;
const SET_INTRO_DURATION_MS = 3000;
const ROOM_RECONNECT_MIN_MS = 2000;
const SOLD_CONFETTI_DURATION_MS = 3500;
const CONFETTI_COMPLETION_BUFFER_MS = 200;
const CHAT_CACHE_PREFIX = "ipl-auction-chat-history";

const getBoughtPriceNumber = (player) => {
  const soldPrice = Number(player?.soldPrice);
  if (Number.isFinite(soldPrice) && soldPrice > 0) return soldPrice;

  const price = Number(player?.price);
  if (Number.isFinite(price) && price > 0) return price;

  return 0;
};

const buildEndedSnapshotKey = (roomId) =>
  `${ENDED_SNAPSHOT_PREFIX}-${String(roomId || "").trim().toUpperCase()}`;

const getConnectionApi = () =>
  typeof navigator === "undefined"
    ? null
    : navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

const resolveSignalLevel = ({ online, socketConnected, effectiveType, downlink, rtt }) => {
  if (!online || !socketConnected) return "red";

  let score = 2;
  const type = String(effectiveType || "").toLowerCase();

  if (type.includes("2g") || type === "slow-2g") {
    score = Math.min(score, 0);
  } else if (type.includes("3g")) {
    score = Math.min(score, 1);
  }

  if (Number.isFinite(downlink)) {
    if (downlink < 1) score = Math.min(score, 0);
    else if (downlink < 5) score = Math.min(score, 1);
  }

  if (Number.isFinite(rtt)) {
    if (rtt > 300) score = Math.min(score, 0);
    else if (rtt > 150) score = Math.min(score, 1);
  }

  if (score <= 0) return "red";
  if (score === 1) return "yellow";
  return "green";
};

const launchConfettiBurst = () => {
  if (typeof window === "undefined") return;
  const base = {
    particleCount: 110,
    spread: 90,
    startVelocity: 45,
    gravity: 0.9,
    scalar: 1,
    zIndex: 140,
    ticks: 180,
    disableForReducedMotion: true,
    colors: ["#f59e0b", "#22d3ee", "#34d399", "#f43f5e", "#fef08a", "#60a5fa"],
  };

  confetti({
    ...base,
    origin: { x: 0.5, y: 0.08 },
  });
};

const ConfettiBurst = ({ active }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        x: ((index * 41) % 64) - 32,
        left: ((index * 13) % 92) + 4,
        color: ["#f59e0b", "#22d3ee", "#34d399", "#f43f5e", "#fef08a", "#60a5fa"][index % 6],
      })),
    []
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            top: "0%",
            backgroundColor: p.color,
            "--tx": `${p.x}vw`,
          }}
        />
      ))}
    </div>
  );
};

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

  const isXs = size === "xs";
  const isSm = size === "sm";
  const isLg = size === "lg";
  const isXl = size === "xl";
  const sizeClass = isXs ? "h-4 w-4" : isSm ? "h-6 w-6" : isLg ? "h-14 w-14" : isXl ? "h-20 w-20" : "h-8 w-8";

  return (
    <span
      className={`inline-flex items-center justify-center bg-transparent ${sizeClass} p-0`}
      title={teamId}
      style={{ backgroundColor: "transparent" }}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={teamId}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
          className="h-full w-full object-contain bg-transparent"
          style={{
            backgroundColor: "transparent",
            imageRendering: "auto",
            WebkitOptimizeContrast: "revert",
          }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-slate-800 text-[10px] font-bold text-white">
          {team.short || teamId}
        </span>
      )}
    </span>
  );
}

function TeamSnapshotCard({ teamId, team, purse, users = [], metadataMap = {} }) {
  if (!team) return null;
  const teamPlayers = Array.isArray(team?.players) ? team.players : [];
  const owner = users.find(u => u.team === teamId);
  const ownerName = owner ? `(${owner.name})` : "";
  
  const teamData = IPL_TEAMS.find(t => t.id === teamId);
  const backgroundClass = teamData?.tileBg || "bg-slate-950";
  
  return (
    <div 
      id={`snapshot-squad-${teamId}`} 
      className={`p-6 ${backgroundClass} text-white rounded-2xl border border-white/10 w-[600px] shadow-2xl relative overflow-hidden`}
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Background Glows for Image */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full" />

      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <TeamLogoBadge teamId={teamId} size="lg" />
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              {teamId} <span className="text-xl font-bold text-slate-400">{ownerName}</span>
              {teamId === "GT" && "👑"}
            </h2>
            <div className="text-sm text-blue-400 font-bold tracking-widest uppercase">
              IPL AUCTION SQUAD
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="price-font text-2xl font-black text-amber-400">₹{formatAmount(purse)}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Remaining Purse</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {teamPlayers.length > 0 ? (
          teamPlayers.map((p, idx) => {
            const cleanName = String(p.name || "").replace(/\(T\)$/i,'').trim();
            const lowerName = cleanName.toLowerCase();
            const meta = metadataMap[lowerName];

            const isForeign = meta ? meta.isForeign : (
                              p.isForeign || 
                              String(p.role || "").toLowerCase().includes("overseas") ||
                              String(p.set || "").toLowerCase().includes("overseas") ||
                              String(p.category || "").toLowerCase().includes("overseas") ||
                              (p.nationality && p.nationality !== "Indian")
                            );

            return (
              <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 flex-1 min-w-0 leading-normal">
                  <span>{cleanName}</span>
                  {isForeign && (
                    <span className="inline-flex items-center justify-center text-blue-400 text-[11px] leading-none shrink-0" title="Overseas">✈</span>
                  )}
                </span>
                <span className="price-font text-[11px] font-bold text-amber-500/80">₹{formatAmount(p.soldPrice || p.price || 0)}</span>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 py-8 text-center text-slate-500 italic uppercase tracking-widest text-xs">
            No players in squad board...
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center pt-4 border-t border-white/10 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        <div>Players: {team.totalPlayers || teamPlayers.length} • Overseas: {team.overseasCount || 0}</div>
        <div className="text-blue-500/60">IPL Auction Platform</div>
      </div>
    </div>
  );
}

function InternetSignalIcon({ level }) {
  const activeBars = level === "green" ? 3 : level === "yellow" ? 2 : 1;
  const palette =
    level === "green"
      ? { top: "#86efac", mid: "#22c55e", low: "#166534" }
      : level === "yellow"
        ? { top: "#fde68a", mid: "#f59e0b", low: "#92400e" }
        : { top: "#fda4af", mid: "#f43f5e", low: "#881337" };

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" strokeLinecap="round">
      <defs>
        <linearGradient id="sig-3d-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.top} />
          <stop offset="55%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.low} />
        </linearGradient>
        <filter id="sig-3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.1" stdDeviation="0.8" floodColor="#020617" floodOpacity="0.55" />
        </filter>
      </defs>
      <g filter="url(#sig-3d-shadow)" stroke="url(#sig-3d-grad)">
        <path d="M2 8a14 14 0 0 1 20 0" strokeWidth="2.4" opacity={activeBars >= 3 ? 1 : 0.2} />
        <path d="M5 11a9 9 0 0 1 14 0" strokeWidth="2.4" opacity={activeBars >= 2 ? 1 : 0.2} />
        <path d="M8 14a5 5 0 0 1 8 0" strokeWidth="2.4" opacity={activeBars >= 1 ? 1 : 0.2} />
      </g>
      <circle cx="12" cy="18" r="1.8" fill="url(#sig-3d-grad)" filter="url(#sig-3d-shadow)" />
      <circle cx="11.3" cy="17.35" r="0.55" fill="#ffffff" opacity="0.42" />
    </svg>
  );
}

function FeedbackStars({ rating, setRating, disabled }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-all duration-200 ${
            (hover || rating) >= star ? "text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-slate-600 scale-100"
          } ${disabled ? "cursor-default opacity-50" : "cursor-pointer hover:scale-125 active:scale-95"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <defs>
        <filter id="user-clear-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodColor="#020617" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* Standard login-style avatar: head + shoulders */}
      <circle cx="12" cy="8" r="3.2" fill="#f8fafc" filter="url(#user-clear-shadow)" />
      <path
        d="M4.7 18.2c0-3.2 2.8-5.4 7.3-5.4s7.3 2.2 7.3 5.4c0 .6-.5 1.1-1.1 1.1H5.8c-.6 0-1.1-.5-1.1-1.1z"
        fill="#f8fafc"
        filter="url(#user-clear-shadow)"
      />
      <circle cx="10.9" cy="6.9" r="0.85" fill="#ffffff" opacity="0.45" />
    </svg>
  );
}

function AuctionPage() {
  const [isLeavingToHome, setIsLeavingToHome] = useState(false);
    // Global mute state, persisted
    const [muted, setMuted] = useState(() => {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("ipl-auction-mute");
        return stored === "true";
      }
      return false;
    });

    useEffect(() => {
      auctionSounds._MUTED = muted;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ipl-auction-mute", muted ? "true" : "false");
      }
    }, [muted]);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [auction, setAuction] = useState({
    status: "WAITING",
    roundId: 0,
    currentSet: null,
    currentPlayer: null,
    highestBid: null,
    highestBidder: null,
    auctionPaused: false,
    acceleratedRound: null,
  });
  const [timer, setTimer] = useState(0);
  const [teamState, setTeamState] = useState({});
  const [teamInsights, setTeamInsights] = useState({});
  const [users, setUsers] = useState([]);
  const [seenRoomUsers, setSeenRoomUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [bootstrapSets, setBootstrapSets] = useState([]);
  const [roomAuctionType, setRoomAuctionType] = useState("unknown");
  const [adminUserId, setAdminUserId] = useState(null);
  const [isAcceleratedRound, setIsAcceleratedRound] = useState(false);
  const [acceleratedRoundPlayers, setAcceleratedRoundPlayers] = useState([]);
  const [autoStartSeconds, setAutoStartSeconds] = useState(null);
  const [roomNotice, setRoomNotice] = useState(null);
  const [networkSignal, setNetworkSignal] = useState({
    level: "yellow",
    label: "Checking",
    detail: "",
  });
  const [isConnectingRoom, setIsConnectingRoom] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [warningMessage, setWarningMessage] = useState(null);
  const [auctionResult, setAuctionResult] = useState(null);
  const [isStartTransitioning, setIsStartTransitioning] = useState(false);
  const [goingOnce, setGoingOnce] = useState(false);
  const [goingTwice, setGoingTwice] = useState(false);
  const [bidFlash, setBidFlash] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [setIntroName, setSetIntroName] = useState("");
  const [setIntroCountdown, setSetIntroCountdown] = useState(0);
  const [nextPlayerText, setNextPlayerText] = useState("");
  const [playerEntryActive, setPlayerEntryActive] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Standardize Warning/Notice Auto-Dismissal (2 Seconds)
  useEffect(() => {
    if (warningMessage) {
      const timer = setTimeout(() => setWarningMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [warningMessage]);

  useEffect(() => {
    if (roomNotice) {
      const timer = setTimeout(() => setRoomNotice(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [roomNotice]);

  /**
   * --- CONSOLIDATED PLAYER METADATA MAP ---
   * Indexes every player from bootstrapSets and teamState by their lowercased name.
   * This is the source of truth for Roles and Overseas status (✈).
   */
  const playerMetadataMap = useMemo(() => {
    const map = {};
    const processPlayer = (p) => {
      if (!p?.name) return;
      const lowerName = String(p.name).toLowerCase().replace(/\(t\)$/, "").trim();
      if (!map[lowerName]) {
        map[lowerName] = {
          role: p.role,
          country: p.country || p.nationality,
          isForeign: p.isForeign || (p.country && p.country !== "India") || (p.nationality && p.nationality !== "Indian"),
          category: p.category || p.set,
          rating: p.rating,
        };
      }
    };

    // 1. Index bootstrap sets (entire pool)
    if (Array.isArray(bootstrapSets)) {
      bootstrapSets.forEach(set => {
        if (Array.isArray(set.players)) {
          set.players.forEach(processPlayer);
        }
      });
    }

    // 2. Index Mini-Auction Presets (Historical/Fallback data)
    Object.values(MINI_SQUAD_PRESETS || {}).forEach(team => {
      if (Array.isArray(team.players)) {
        team.players.forEach(processPlayer);
      }
    });

    // 3. Index currently sold players (live state)
    Object.values(teamState || {}).forEach(team => {
      if (Array.isArray(team.players)) {
        team.players.forEach(processPlayer);
      }
    });

    // 3. Index current player
    if (auction.currentPlayer) processPlayer(auction.currentPlayer);

    return map;
  }, [bootstrapSets, teamState, auction.currentPlayer]);

  const chatQueueRef = useRef([]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (chatQueueRef.current.length === 0) return;
      const batch = chatQueueRef.current;
      chatQueueRef.current = [];
          setChatMessages(prev => {
            // Merge all messages and deduplicate by a robust key
            const combined = [...prev, ...batch];
            const seen = new Set();
            const unique = [];
            for (let i = combined.length - 1; i >= 0; i--) {
              const m = combined[i];
              // Robust key: sentAt, username, team, message, isSystem, auctionEvent.type, auctionEvent.playerName, auctionEvent.team, auctionEvent.amount
              const msgId = [
                m.sentAt ?? '',
                m.username ?? '',
                m.team ?? '',
                m.message ?? '',
                m.isSystem ? '1' : '0',
                m.auctionEvent?.type ?? '',
                m.auctionEvent?.playerName ?? '',
                m.auctionEvent?.team ?? '',
                m.auctionEvent?.amount ?? ''
              ].join('|');
              if (!seen.has(msgId)) {
                seen.add(msgId);
                unique.unshift(m);
              }
            }
            // Always sort by sentAt ascending
            return unique.sort((a, b) => (Number(a?.sentAt) || 0) - (Number(b?.sentAt) || 0)).slice(-500);
          });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleAcceleratedStart = (payload) => {
      setIsAcceleratedRound(true);
      if (payload && payload.unsoldPlayers) {
        setAcceleratedRoundPlayers(new Array(payload.unsoldPlayers.length).fill({}));
      } else if (payload && payload.playerCount) {
        setAcceleratedRoundPlayers(new Array(payload.playerCount).fill({}));
      }
    };
    socket.on("acceleratedRoundStarted", handleAcceleratedStart);
    return () => socket.off("acceleratedRoundStarted", handleAcceleratedStart);
  }, []);

  useEffect(() => {
    const currentSetName = typeof auction.currentSet === 'string' ? auction.currentSet : auction.currentSet?.setName;
    if (isAcceleratedRound && currentSetName !== "Accelerated Round" && auction.status !== "WAITING" && auction.status !== "NEXT_PLAYER") {
      setIsAcceleratedRound(false);
    }
  }, [isAcceleratedRound, auction.currentSet, auction.status]);

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiBurstId, setConfettiBurstId] = useState(0);
  const [lastRoundResult, setLastRoundResult] = useState("");
  const [lastResultPlayer, setLastResultPlayer] = useState(null);
  const [unsoldPinnedPlayer, setUnsoldPinnedPlayer] = useState(null);
  const [playerFadeOut, setPlayerFadeOut] = useState(false);
  const [soldHighlightActive, setSoldHighlightActive] = useState(false);
  const [bidPulse, setBidPulse] = useState(false);
  const [isAdminActionPending, setIsAdminActionPending] = useState(false);
  const [isAuctionEnding, setIsAuctionEnding] = useState(false);
  const [isDismissingAuctionResult, setIsDismissingAuctionResult] = useState(false);
  const [showEndAuctionConfirm, setShowEndAuctionConfirm] = useState(false);
  const [showTopMenuPanel, setShowTopMenuPanel] = useState(false);
  const [showActivePeoplePanel, setShowActivePeoplePanel] = useState(false);
  const [showExpensiveBuys, setShowExpensiveBuys] = useState(false);
  const [showPurseSpentByTeams, setShowPurseSpentByTeams] = useState(false);
  const [bidRipple, setBidRipple] = useState({ show: false, x: 0, y: 0 });
  const [auctionResultExpandedTeams, setAuctionResultExpandedTeams] = useState({});
  const [auctionResultRatingsByTeam, setAuctionResultRatingsByTeam] = useState({});
  const [isAuctionResultRatingsLoading, setIsAuctionResultRatingsLoading] = useState(false);
  const [auctionResultRatingsError, setAuctionResultRatingsError] = useState("");
  const [liveTeamRatings, setLiveTeamRatings] = useState({});
  const [selectedResultTeam, setSelectedResultTeam] = useState(null);
  const [animatedHighestBid, setAnimatedHighestBid] = useState(null);
  const [bidAmountPop, setBidAmountPop] = useState(false);
  const topMenuRef = useRef(null);
  const activePeopleRef = useRef(null);
  const prevBidderRef = useRef(null);
  const prevSetRef = useRef("");
  const prevTimerRef = useRef(0);
  const bidDebounceRef = useRef(null);
  const pendingBidUpdateRef = useRef(null);
  const entryTimeoutRef = useRef(null);
  const introTimeoutRef = useRef(null);
  const introIntervalRef = useRef(null);
  const confettiTimeoutRef = useRef(null);
  const confettiReleaseTimeoutRef = useRef(null);
  const rejoinRetryTimeoutRef = useRef(null);
  const hideConnectingTimeoutRef = useRef(null);
  const rejoinAttemptsRef = useRef(0);
  const rejoinRequestIdRef = useRef(0);
  const roomSyncedRef = useRef(false);
  const connectingGateUntilRef = useRef(0);
  const prevAuctionStatusRef = useRef("WAITING");
  const currentRoundIdRef = useRef(0);
  const lastResultEffectAtRef = useRef(0);
  const lastHammerAtRef = useRef(0);
  const latestAuctionRef = useRef(auction);
  const prevTotalSoldPlayersRef = useRef(0);
  const lastSoldEventAtRef = useRef(0);
  const timerStartFloorRef = useRef(0);
  const timerGuardUntilRef = useRef(0);
  const timerGuardRoundRef = useRef(0);
  const confettiLockUntilRef = useRef(0);
  const pendingNewPlayerRef = useRef(null);
  const pendingTimerPayloadRef = useRef(null);
    const pendingPlayerChangeRef = useRef(null);
  const unsoldHoldUntilRef = useRef(0);
  const unsoldPinTimeoutRef = useRef(null);
  const unsoldPinnedUntilRef = useRef(0);
  const unsoldPinnedPlayerRef = useRef(null);
  const bidClickLockUntilRef = useRef(0);
  const bootstrapRetryTimeoutRef = useRef(null);
  const bidAmountAnimationFrameRef = useRef(null);
  const bidAmountPopTimeoutRef = useRef(null);
  const animatedBidValueRef = useRef(null);
  const dismissNavigationTimeoutRef = useRef(null);
  const prevRoomIdRef = useRef(null);
  const skipInitialLoadingRef = useRef(Boolean(location.state?.skipLoading === true));

  useEffect(() => {
    // Sync skipInitialLoadingRef on mount/roomId change
    skipInitialLoadingRef.current = Boolean(location.state?.skipLoading === true);
  }, [roomId, location.state?.skipLoading]);

  useEffect(() => {
    const nextBid = typeof auction.highestBid === "number" ? auction.highestBid : null;

    if (nextBid == null) {
      animatedBidValueRef.current = null;
      setAnimatedHighestBid(null);
      return;
    }

    const fromBid = typeof animatedBidValueRef.current === "number" ? animatedBidValueRef.current : nextBid;

    if (fromBid === nextBid) {
      animatedBidValueRef.current = nextBid;
      setAnimatedHighestBid(nextBid);
      return;
    }

    if (bidAmountAnimationFrameRef.current) {
      window.cancelAnimationFrame(bidAmountAnimationFrameRef.current);
      bidAmountAnimationFrameRef.current = null;
    }

    const duration = 360;
    const startAt = performance.now();
    const delta = nextBid - fromBid;

    if (delta > 0) {
      setBidAmountPop(true);
      if (bidAmountPopTimeoutRef.current) {
        clearTimeout(bidAmountPopTimeoutRef.current);
      }
      bidAmountPopTimeoutRef.current = setTimeout(() => {
        setBidAmountPop(false);
      }, 280);
    }

    const step = (timestamp) => {
      const elapsed = Math.min(timestamp - startAt, duration);
      const progress = elapsed / duration;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const value = fromBid + delta * easedProgress;
      animatedBidValueRef.current = value;
      setAnimatedHighestBid(value);

      if (progress < 1) {
        bidAmountAnimationFrameRef.current = window.requestAnimationFrame(step);
      } else {
        bidAmountAnimationFrameRef.current = null;
        animatedBidValueRef.current = nextBid;
        setAnimatedHighestBid(nextBid);
      }
    };

    bidAmountAnimationFrameRef.current = window.requestAnimationFrame(step);
  }, [auction.highestBid]);


  useEffect(() => () => {
    if (bidAmountAnimationFrameRef.current) {
      window.cancelAnimationFrame(bidAmountAnimationFrameRef.current);
    }
    if (bidAmountPopTimeoutRef.current) {
      clearTimeout(bidAmountPopTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const shouldSkip = Boolean(location.state?.skipLoading === true);
    skipInitialLoadingRef.current = shouldSkip;

    if (shouldSkip) {
      // Consume skipLoading once so browser refresh does not keep skipping loader.
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate, roomId]);
  const unlockAudio = useCallback(() => {
    auctionSounds.preload();
  }, []);

  const releaseConnectingOverlay = useCallback((force = false) => {
    if (force) {
      if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
      setIsConnectingRoom(false);
      return;
    }
    const remaining = connectingGateUntilRef.current - Date.now();
    if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
    if (remaining > 0) {
      hideConnectingTimeoutRef.current = setTimeout(() => {
        setIsConnectingRoom(false);
      }, remaining);
      return;
    }
    setIsConnectingRoom(false);
  }, []);

  const saveEndedSnapshot = useCallback((snapshot) => {
    const key = buildEndedSnapshotKey(roomId);
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          ...snapshot,
          savedAt: Date.now(),
        })
      );
    } catch {
      // Ignore localStorage write issues.
    }
  }, [roomId]);

  const loadEndedSnapshot = useCallback(() => {
    const key = buildEndedSnapshotKey(roomId);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }, [roomId]);

  const clearEndedSnapshot = useCallback(() => {
    const key = buildEndedSnapshotKey(roomId);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage remove issues.
    }
  }, [roomId]);

  const mergeChatHistory = useCallback((incoming = []) => {
    if (!Array.isArray(incoming)) return;

    setChatMessages((prev) => {
      const map = new Map();
      const push = (item) => {
        if (!item) return;
        const key = [
          item.sentAt ?? "",
          item.username ?? "",
          item.team ?? "",
          item.message ?? "",
          item.isSystem ? "1" : "0",
          item.auctionEvent?.type ?? "",
          item.auctionEvent?.playerName ?? "",
          item.auctionEvent?.team ?? "",
          item.auctionEvent?.amount ?? "",
        ].join("|");
        if (!map.has(key)) {
          map.set(key, item);
        }
      };

      prev.forEach(push);
      incoming.forEach(push);

      return Array.from(map.values()).sort((a, b) => (Number(a?.sentAt) || 0) - (Number(b?.sentAt) || 0));
    });
  }, []);

  useEffect(() => {
    const normalizedRoomId = String(roomId || "").trim().toUpperCase();
    if (!normalizedRoomId) return;

    const cacheKey = `${CHAT_CACHE_PREFIX}:${normalizedRoomId}`;
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (!cachedRaw) return;
      const cachedMessages = JSON.parse(cachedRaw);
      if (!Array.isArray(cachedMessages) || cachedMessages.length === 0) return;
      mergeChatHistory(cachedMessages);
    } catch {
      // Ignore bad cache payloads.
    }
  }, [mergeChatHistory, roomId]);

  useEffect(() => {
    const normalizedRoomId = String(roomId || "").trim().toUpperCase();
    if (!normalizedRoomId) return;
    if (!Array.isArray(chatMessages) || chatMessages.length === 0) return;

    const cacheKey = `${CHAT_CACHE_PREFIX}:${normalizedRoomId}`;
    
    // Use a timeout to debounce saving to localStorage
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(chatMessages.slice(-500)));
      } catch {
        // Ignore storage quota/serialization failures.
      }
    }, 1000); // Save only once per second during rapid bursts

    return () => clearTimeout(timeout);
  }, [chatMessages, roomId]);

  const requestRoomBootstrap = useCallback((targetRoomId, attempt = 0) => {
    const normalizedRoomId = String(targetRoomId || "").trim().toUpperCase();
    if (!normalizedRoomId) return;

    socket.emit("getChatHistory", { roomId: normalizedRoomId }, (response) => {
      // Check if we are still in the room we requested history for
      if (String(roomId || "").trim().toUpperCase() !== normalizedRoomId) return;
      if (!response?.ok || !Array.isArray(response.messages)) return;
      mergeChatHistory(response.messages);
    });

    socket.emit("getSetsSnapshot", { roomId: normalizedRoomId }, (response) => {
      if (String(roomId || "").trim().toUpperCase() !== normalizedRoomId) return;
      if (response?.ok && Array.isArray(response.sets) && response.sets.length > 0) {
        setBootstrapSets(response.sets);
        return;
      }

      if (attempt >= 8) return;
      if (bootstrapRetryTimeoutRef.current) clearTimeout(bootstrapRetryTimeoutRef.current);
      bootstrapRetryTimeoutRef.current = setTimeout(() => {
        requestRoomBootstrap(normalizedRoomId, attempt + 1);
      }, 450);
    });
  }, [mergeChatHistory, roomId]);

  const hydrateFromRoomState = useCallback((roomState) => {
    if (!roomState) return;

    const currentAuctionType = (roomState.auctionType || roomAuctionType) === "mini" ? "mini" : "mega";
    if (Object.prototype.hasOwnProperty.call(roomState, "auctionType")) {
      setRoomAuctionType(currentAuctionType);
    }

    if (roomState.adminUserId) {
      setAdminUserId(roomState.adminUserId);
    }

    if (roomState.teamState) {
      // Auto Score calculation for all Auctions during initial hydration
      if (roomState.teamState) {
        Object.entries(roomState.teamState).forEach(([teamId, teamData]) => {
          if (teamData?.players) {
            roomState.teamState[teamId].autoScore = calculateMiniTeamScore(teamData.players, teamId);
          }
        });
      }

      setTeamState(roomState.teamState || {});
      
      const newInsights = {};
      Object.entries(roomState.teamState).forEach(([teamId, data]) => {
        if (data?.players) {
          newInsights[teamId] = generateTeamInsights(data.players, teamId, newInsights);
        }
      });
      setTeamInsights(prev => ({ ...prev, ...newInsights }));

      const totalSoldPlayers = Object.values(roomState.teamState || {}).reduce(
        (sum, team) => sum + (Array.isArray(team?.players) ? team.players.length : 0),
        0
      );
      prevTotalSoldPlayersRef.current = totalSoldPlayers;
    }

    if (Array.isArray(roomState.users)) {
      setUsers(roomState.users);
    }

    if (roomState.auctionState) {
      const {
        timerSeconds,
        currentSet,
        currentPlayer,
        highestBid,
        highestBidder,
        status,
        auctionPaused,
        ...restAuctionState
      } = roomState.auctionState;

      const normalizedStatus = String(status || "").toUpperCase();

      setAuction((prev) => ({
        ...prev,
        ...restAuctionState,
        currentSet: currentSet ?? null,
        currentPlayer: currentPlayer ?? null,
        highestBid: highestBid ?? null,
        highestBidder: highestBidder ?? null,
        status: status ?? prev.status,
        auctionPaused: auctionPaused != null ? Boolean(auctionPaused) : prev.auctionPaused,
        timerSeconds: Number(timerSeconds ?? 0),
      }));

      if (normalizedStatus === "ENDED") {
        setIsAuctionEnding(true);
        const endedSnapshot = {
          message: roomState.auctionState.endMessage || "Auction ended",
          teamState: roomState.teamState || {},
          teamRatings: Array.isArray(roomState.auctionState.teamRatings)
            ? roomState.auctionState.teamRatings
            : [],
        };
        setAuctionResult(endedSnapshot);
        saveEndedSnapshot(endedSnapshot);
        // If we are already ended, we should release the overlay immediately
        releaseConnectingOverlay(true);
      } else {
        clearEndedSnapshot();
      }

      const hydratedRound = Number(roomState.auctionState.roundId ?? 0);
      currentRoundIdRef.current = Number.isFinite(hydratedRound) ? hydratedRound : 0;

      const sec = Number(timerSeconds ?? 0);
      setTimer(sec);
      prevTimerRef.current = sec;
      if (sec === 2) {
        setGoingOnce(true);
        setGoingTwice(false);
      } else if (sec === 1) {
        setGoingOnce(false);
        setGoingTwice(true);
      } else {
        setGoingOnce(false);
        setGoingTwice(false);
      }

      if (roomState.auctionState.autoStartSecondsRemaining != null) {
        setAutoStartSeconds(roomState.auctionState.autoStartSecondsRemaining);
      } else {
        setAutoStartSeconds(null);
      }

      if (roomState.auctionState.nextPlayerPreviewName) {
        setNextPlayerText(`Next Player: ${roomState.auctionState.nextPlayerPreviewName}`);
      } else {
        setNextPlayerText("");
      }
    }
  }, [clearEndedSnapshot, saveEndedSnapshot]);

  const startSetIntro = useCallback((setName, durationMs = SET_INTRO_DURATION_MS) => {
    if (!setName) return;
    setIsStartTransitioning(false);
    const duration = Number(durationMs) || SET_INTRO_DURATION_MS;
    const totalSeconds = Math.max(1, Math.ceil(duration / 1000));

    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    if (introIntervalRef.current) clearInterval(introIntervalRef.current);

    setSetIntroName(setName);
    setSetIntroCountdown(totalSeconds);

    introIntervalRef.current = setInterval(() => {
      setSetIntroCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    introTimeoutRef.current = setTimeout(() => {
      if (introIntervalRef.current) {
        clearInterval(introIntervalRef.current);
        introIntervalRef.current = null;
      }
      setSetIntroCountdown(0);
      setSetIntroName("");
    }, duration);
  }, []);

  const applyTimerPayload = useCallback((payload) => {
    const sec = Number(payload.timerSeconds ?? 0);

    const incomingRound = Number(payload?.roundId ?? 0);
    const guardRound = Number(timerGuardRoundRef.current || 0);
    if (
      Date.now() < timerGuardUntilRef.current &&
      guardRound > 0 &&
      Number.isFinite(incomingRound) &&
      incomingRound === guardRound &&
      sec > 0 &&
      sec < timerStartFloorRef.current
    ) {
      // Ignore premature lower ticks for the brand-new round while sold/confetti lock is releasing.
      return;
    }

    if (Number.isFinite(incomingRound) && incomingRound > guardRound) {
      timerGuardUntilRef.current = 0;
      timerStartFloorRef.current = 0;
      timerGuardRoundRef.current = 0;
    }

    setTimer(sec);

    if (sec > 0 && sec <= 5 && sec !== prevTimerRef.current) {
      auctionSounds.timerUrgent();
    }

    prevTimerRef.current = sec;

    if (sec === 2) {
      setGoingOnce(true);
      setGoingTwice(false);
    } else if (sec === 1) {
      setGoingOnce(false);
      setGoingTwice(true);
    } else {
      setGoingOnce(false);
      setGoingTwice(false);
    }
    if (payload.auctionPaused != null) {
      setAuction((prev) => ({
        ...prev,
        auctionPaused: Boolean(payload.auctionPaused),
      }));
    }
  }, []);

  const triggerUnsoldEffects = useCallback(() => {
    lastResultEffectAtRef.current = Date.now();
    setLastRoundResult("UNSOLD");
    setSoldHighlightActive(false);
    auctionSounds.unsold();
    setPlayerFadeOut(false);
  }, []);

  const applyNewPlayerPayload = useCallback((payload) => {
    const prevAuction = latestAuctionRef.current;
    const prevPlayerName = prevAuction?.currentPlayer?.name;
    const nextPlayerName = payload?.currentPlayer?.name;
    const playerChanged = Boolean(prevPlayerName && nextPlayerName && prevPlayerName !== nextPlayerName);
    const recentlyHandled = Date.now() - lastResultEffectAtRef.current < 1800;


    const incomingRoundId = Number(payload?.roundId ?? 0);
    if (Number.isFinite(incomingRoundId) && incomingRoundId > 0) {
      currentRoundIdRef.current = incomingRoundId;
    }

    if (playerChanged && !recentlyHandled) {
      if (!prevAuction?.highestBidder) {
        triggerUnsoldEffects();
      }
    }

    setNextPlayerText("");

    const configuredTimer = Number(latestAuctionRef.current?.timerConfigSeconds || 10);

    setAuction((prev) => ({
      ...prev,
      status: payload.status,
      roundId:
        Number.isFinite(incomingRoundId) && incomingRoundId > 0
          ? incomingRoundId
          : prev.roundId,
      currentSet: payload.currentSet,
      currentPlayer: payload.currentPlayer,
      highestBid: null,
      highestBidder: null,
      timerSeconds: payload.timerSeconds != null ? Number(payload.timerSeconds) : prev.timerSeconds,
    }));

    if (payload.status === "RUNNING" && payload.currentPlayer) {
      const incomingTimer = Number(payload.timerSeconds);
      const soldRecently = Date.now() - lastSoldEventAtRef.current < 8000;
      let nextVisibleTimer = Number.isFinite(incomingTimer) && incomingTimer >= 0
        ? incomingTimer
        : configuredTimer;

      if (soldRecently && Number.isFinite(configuredTimer) && configuredTimer > 0) {
        nextVisibleTimer = configuredTimer;
        timerStartFloorRef.current = configuredTimer;
        timerGuardRoundRef.current =
          Number.isFinite(incomingRoundId) && incomingRoundId > 0 ? incomingRoundId : 0;
        // Keep a short guard so delayed low ticks (7/2) are ignored for the first second.
        timerGuardUntilRef.current = Date.now() + 950;
      } else {
        timerStartFloorRef.current = 0;
        timerGuardUntilRef.current = 0;
        timerGuardRoundRef.current = 0;
      }

      if (Number.isFinite(nextVisibleTimer) && nextVisibleTimer >= 0) {
        setTimer(nextVisibleTimer);
        prevTimerRef.current = nextVisibleTimer;
        if (nextVisibleTimer === 2) {
          setGoingOnce(true);
          setGoingTwice(false);
        } else if (nextVisibleTimer === 1) {
          setGoingOnce(false);
          setGoingTwice(true);
        } else {
          setGoingOnce(false);
          setGoingTwice(false);
        }
      } else {
        setGoingOnce(false);
        setGoingTwice(false);
      }
      setSoldHighlightActive(false);
      setIsStartTransitioning(false);
      auctionSounds.newPlayer();
      setLastRoundResult("");
      
      stopPremiumEventSounds();

      setLastResultPlayer(null);
      unsoldPinnedUntilRef.current = 0;
      setUnsoldPinnedPlayer(null);
      if (unsoldPinTimeoutRef.current) {
        clearTimeout(unsoldPinTimeoutRef.current);
        unsoldPinTimeoutRef.current = null;
      }
      setPlayerEntryActive(true);
      if (entryTimeoutRef.current) clearTimeout(entryTimeoutRef.current);
      entryTimeoutRef.current = setTimeout(() => {
        setPlayerEntryActive(false);
      }, PLAYER_ENTRY_DURATION_MS);
      const isConfettiStillAnimating = Date.now() < confettiLockUntilRef.current;
      if (!isConfettiStillAnimating) {
        setPlayerFadeOut(false);
      }
    }

  }, [triggerUnsoldEffects]);

  const applyPlayerChange = useCallback((payload) => {
    const nextName = String(payload?.nextPlayerName || "").trim();
    const nextKey = String(payload?.nextPlayerKey || "").trim();
    const payloadCurrentKey = String(payload?.currentPlayer?.id ?? payload?.currentPlayer?.name ?? "").trim();
    const renderedCurrentKey = String(
      latestAuctionRef.current?.currentPlayer?.id ?? latestAuctionRef.current?.currentPlayer?.name ?? ""
    ).trim();

    if (nextKey && payloadCurrentKey && nextKey === payloadCurrentKey) {
      setNextPlayerText("");
      return;
    }

    if (nextKey && renderedCurrentKey && nextKey === renderedCurrentKey) {
      setNextPlayerText("");
      return;
    }

    if (nextName) {
      setNextPlayerText(`Next Player: ${nextName}`);
      return;
    }

    const incomingText = String(payload?.nextPlayerText || "").trim();
    const fallbackMatch = incomingText.match(/^Next Player:\s*(.+)$/i);
    const fallbackName = fallbackMatch ? String(fallbackMatch[1] || "").trim().toLowerCase() : "";
    const payloadCurrentName = String(payload?.currentPlayer?.name || "").trim().toLowerCase();
    const renderedCurrentName = String(latestAuctionRef.current?.currentPlayer?.name || "").trim().toLowerCase();

    if (fallbackName && (fallbackName === payloadCurrentName || fallbackName === renderedCurrentName)) {
      setNextPlayerText("");
      return;
    }

    setNextPlayerText(incomingText);
  }, []);

  const triggerSoldEffects = useCallback(() => {
    lastResultEffectAtRef.current = Date.now();
    setLastRoundResult("SOLD");
    setSoldHighlightActive(true);
    const now = Date.now();
    if (now - lastHammerAtRef.current > 1200) {
      lastHammerAtRef.current = now;
      auctionSounds.preload();
      auctionSounds.hammer();
    }

    if (isConnectingRoom) {
      setShowConfetti(false);
      confettiLockUntilRef.current = 0;
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
      if (confettiReleaseTimeoutRef.current) clearTimeout(confettiReleaseTimeoutRef.current);
      if (typeof confetti.reset === "function") {
        confetti.reset();
      }
      return;
    }

    // Force a fresh confetti mount every sold event, even if a previous burst is still active.
    setShowConfetti(false);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        setConfettiBurstId((prev) => prev + 1);
        setShowConfetti(true);
        launchConfettiBurst();
      });
    } else {
      setConfettiBurstId((prev) => prev + 1);
      setShowConfetti(true);
      launchConfettiBurst();
    }
    confettiLockUntilRef.current = Date.now() + SOLD_CONFETTI_DURATION_MS + CONFETTI_COMPLETION_BUFFER_MS;
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), SOLD_CONFETTI_DURATION_MS);
    if (confettiReleaseTimeoutRef.current) clearTimeout(confettiReleaseTimeoutRef.current);
    confettiReleaseTimeoutRef.current = setTimeout(() => {
      confettiLockUntilRef.current = 0;
      const queuedPlayer = pendingNewPlayerRef.current;
      const queuedTimer = pendingTimerPayloadRef.current;
      const queuedPlayerChange = pendingPlayerChangeRef.current;
      pendingNewPlayerRef.current = null;
      pendingTimerPayloadRef.current = null;
      pendingPlayerChangeRef.current = null;
      if (queuedPlayer) {
        applyNewPlayerPayload(queuedPlayer);
      } else if (queuedTimer) {
        applyTimerPayload(queuedTimer);
      }
      if (queuedPlayerChange) {
        applyPlayerChange(queuedPlayerChange);
      }
    }, SOLD_CONFETTI_DURATION_MS + CONFETTI_COMPLETION_BUFFER_MS);
  }, [applyNewPlayerPayload, applyTimerPayload, applyPlayerChange, isConnectingRoom]);

  const onTeamUpdate = useCallback((payload) => {
    const currentAuctionType = (payload?.auctionType || roomAuctionType) === "mini" ? "mini" : "mega";
    if (Object.prototype.hasOwnProperty.call(payload || {}, "auctionType")) {
      setRoomAuctionType(currentAuctionType);
    }
    const firstSync = !roomSyncedRef.current;
    roomSyncedRef.current = true;
    releaseConnectingOverlay();
    const totalSoldPlayers = Object.values(payload.teamState || {}).reduce(
      (sum, team) => sum + (Array.isArray(team?.players) ? team.players.length : 0),
      0
    );
    prevTotalSoldPlayersRef.current = totalSoldPlayers;

    const nextTeamState = payload.teamState || {};
    
    // Auto Score calculation for all Auctions (Client-Side Real-time)
    Object.entries(nextTeamState).forEach(([teamId, teamData]) => {
      if (teamData?.players) {
         nextTeamState[teamId].autoScore = calculateMiniTeamScore(teamData.players, teamId);
      }
    });

    setTeamState(nextTeamState);
    
    if (payload.teamState) {
      const newInsights = {};
      Object.entries(payload.teamState).forEach(([teamId, data]) => {
        if (data?.players) {
          newInsights[teamId] = generateTeamInsights(data.players, teamId, newInsights);
        }
      });
      setTeamInsights(prev => ({ ...prev, ...newInsights }));
    }

    setUsers(payload.users || []);
    if (payload.auctionState) {
      const lockActive = Date.now() < confettiLockUntilRef.current;
      const unsoldPinActive = Date.now() < unsoldPinnedUntilRef.current;
      const {
        currentSet,
        currentPlayer,
        highestBid,
        highestBidder,
        status,
        roundId,
        timerSeconds,
        auctionPaused,
        ...restAuctionState
      } = payload.auctionState;

      const incomingRoundId = Number(roundId ?? 0);
      if (Number.isFinite(incomingRoundId) && incomingRoundId >= 0) {
        currentRoundIdRef.current = incomingRoundId;
      }

      if (lockActive) {
        if (timerSeconds != null || auctionPaused != null) {
          pendingTimerPayloadRef.current = { timerSeconds, auctionPaused };
        }
        return;
      }

      setAuction((prev) => {
        if (firstSync) {
          const pinnedPlayer = unsoldPinnedPlayerRef.current;
          const keepPinnedCurrent = unsoldPinActive && (status === "DELAY" || status === "UNSOLD") && Boolean(pinnedPlayer);
          return {
            ...prev,
            ...restAuctionState,
            roundId: Number.isFinite(incomingRoundId) && incomingRoundId >= 0 ? incomingRoundId : prev.roundId,
            currentSet: currentSet ?? null,
            currentPlayer: keepPinnedCurrent ? pinnedPlayer : (currentPlayer ?? null),
            highestBid: highestBid ?? null,
            highestBidder: highestBidder ?? null,
            status: status ?? prev.status,
            timerSeconds: timerSeconds != null ? Number(timerSeconds) : prev.timerSeconds,
            auctionPaused: auctionPaused != null ? Boolean(auctionPaused) : prev.auctionPaused,
          };
        }
        const isActiveBidding = prev.highestBidder !== null && prev.highestBidder !== undefined;
        const pinnedPlayer = unsoldPinnedPlayerRef.current;
        const keepPinnedCurrent = unsoldPinActive && (status === "DELAY" || status === "UNSOLD") && Boolean(pinnedPlayer);
        return {
          ...prev,
          ...restAuctionState,
          roundId: Number.isFinite(incomingRoundId) && incomingRoundId >= 0 ? incomingRoundId : prev.roundId,
          currentSet: prev.currentSet || currentSet,
          currentPlayer: keepPinnedCurrent ? pinnedPlayer : (prev.currentPlayer || currentPlayer),
          highestBid: isActiveBidding && (highestBid === null || highestBid === undefined) ? prev.highestBid : highestBid,
          highestBidder: isActiveBidding && !highestBidder ? prev.highestBidder : highestBidder,
          status: status ?? prev.status,
          timerSeconds: timerSeconds != null ? timerSeconds : prev.timerSeconds,
          auctionPaused: auctionPaused != null ? auctionPaused : prev.auctionPaused,
        };
      });
      if (payload.auctionState.autoStartSecondsRemaining != null) {
        setAutoStartSeconds(payload.auctionState.autoStartSecondsRemaining);
      } else {
        setAutoStartSeconds(null);
      }
    }
  }, [releaseConnectingOverlay]);

  const onNewPlayer = useCallback((payload) => {
    roomSyncedRef.current = true;
    releaseConnectingOverlay();
    const now = Date.now();
    const isConfettiLocked = now < confettiLockUntilRef.current;
    const isUnsoldPinned = now < unsoldPinnedUntilRef.current;
    if (isConfettiLocked || isUnsoldPinned) {
      pendingNewPlayerRef.current = payload;
      if (isUnsoldPinned && !isConfettiLocked) {
        const remaining = unsoldPinnedUntilRef.current - now;
        if (unsoldPinTimeoutRef.current) clearTimeout(unsoldPinTimeoutRef.current);
        unsoldPinTimeoutRef.current = setTimeout(() => {
           const qP = pendingNewPlayerRef.current;
           const qT = pendingTimerPayloadRef.current;
           const qC = pendingPlayerChangeRef.current;
           pendingNewPlayerRef.current = null;
           pendingTimerPayloadRef.current = null;
           pendingPlayerChangeRef.current = null;
           unsoldPinnedUntilRef.current = 0;
           setUnsoldPinnedPlayer(null);
           if (qP) applyNewPlayerPayload(qP);
           if (qT) applyTimerPayload(qT);
           if (qC) applyPlayerChange(qC);
        }, remaining);
      }
      return;
    }
    applyNewPlayerPayload(payload);
  }, [applyNewPlayerPayload, applyPlayerChange, applyTimerPayload, releaseConnectingOverlay]);

  const onBidUpdate = useCallback((payload) => {
    if (payload.highestBidder && payload.highestBidder !== prevBidderRef.current) {
      prevBidderRef.current = payload.highestBidder;
      auctionSounds.bid();
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 500);
    }
    pendingBidUpdateRef.current = payload;
    if (bidDebounceRef.current) return;
    bidDebounceRef.current = setTimeout(() => {
      const pending = pendingBidUpdateRef.current;
      pendingBidUpdateRef.current = null;
      bidDebounceRef.current = null;
      if (!pending) return;
      setAuction((prev) => ({
        ...prev,
        highestBid: pending.highestBid,
        highestBidder: pending.highestBidder,
        highestBidTimestamp: pending.highestBidTimestamp,
      }));
    }, BID_DEBOUNCE_MS);
  }, []);

  const onTimerUpdate = useCallback((payload) => {
    const now = Date.now();
    const isConfettiLocked = now < confettiLockUntilRef.current;
    const isUnsoldPinned = now < unsoldPinnedUntilRef.current;
    if (isConfettiLocked || isUnsoldPinned) {
      pendingTimerPayloadRef.current = payload;
      return;
    }
    applyTimerPayload(payload);
  }, [applyTimerPayload]);

  const onAuctionPausedEvt = useCallback((payload) => {
    if (payload?.auctionPaused != null) {
      setAuction((prev) => ({
        ...prev,
        auctionPaused: Boolean(payload.auctionPaused),
      }));
    }
  }, []);

  const onPlayerSold = useCallback((payload) => {
    const isSold = payload?.result === "SOLD" || payload?.sold;
    const recentlyHandled = Date.now() - lastResultEffectAtRef.current < 1800;
    const resolvedPlayer = payload?.player || latestAuctionRef.current?.currentPlayer || null;
    if (isSold) {
      if (!recentlyHandled) {
        lastResultEffectAtRef.current = Date.now();
        lastSoldEventAtRef.current = Date.now();
        unsoldHoldUntilRef.current = 0;
        unsoldPinnedUntilRef.current = 0;
        setLastResultPlayer(resolvedPlayer);
        setUnsoldPinnedPlayer(null);
        if (unsoldPinTimeoutRef.current) {
          clearTimeout(unsoldPinTimeoutRef.current);
          unsoldPinTimeoutRef.current = null;
        }
        setSoldHighlightActive(true);
        triggerSoldEffects();
        // playPremiumEventSound(soldSound);
      }
    } else {
      unsoldHoldUntilRef.current = 0;
      setLastResultPlayer(resolvedPlayer);
      setUnsoldPinnedPlayer(resolvedPlayer);
      const pinMs = Number(payload?.delayMs) || 2000;
      unsoldPinnedUntilRef.current = Date.now() + pinMs;
      if (unsoldPinTimeoutRef.current) clearTimeout(unsoldPinTimeoutRef.current);
      unsoldPinTimeoutRef.current = setTimeout(() => {
        unsoldPinnedUntilRef.current = 0;
        setUnsoldPinnedPlayer(null);
        unsoldPinTimeoutRef.current = null;
        stopPremiumEventSounds();
      }, pinMs + 120);
      pendingTimerPayloadRef.current = null;
      if (!recentlyHandled) {
        lastResultEffectAtRef.current = Date.now();
        triggerUnsoldEffects();
        playPremiumEventSound(unsoldSound, { useLastTwoSeconds: true });
      }
    }
    setAuction((prev) => ({
      ...prev,
      currentPlayer: resolvedPlayer || prev.currentPlayer,
      status: payload.result || "SOLD",
    }));
  }, [triggerSoldEffects, triggerUnsoldEffects]);

  const onSetIntro = useCallback((payload) => {
    if (!payload?.setName) return;
    prevSetRef.current = payload.setName;
    startSetIntro(payload.setName, Number(payload.durationMs) || SET_INTRO_DURATION_MS);
  }, [startSetIntro]);

  const onPlayerChange = useCallback((payload) => {
    const now = Date.now();
    const isConfettiLocked = now < confettiLockUntilRef.current;
    const isUnsoldPinned = now < unsoldPinnedUntilRef.current;
    if (isConfettiLocked || isUnsoldPinned) {
      pendingPlayerChangeRef.current = payload;
      return;
    }
    applyPlayerChange(payload);
  }, [applyPlayerChange]);

  const onRoomFranchiseFull = useCallback((payload) => {
    setRoomNotice(payload.message || "All 10 teams are in.");
    auctionSounds.roomFull();
  }, []);

  const onAutoTick = useCallback((payload) => {
    const s = payload.secondsRemaining ?? 0;
    setAutoStartSeconds(s);
    if (s <= 0) return;
    if (s === 1) auctionSounds.countdownGo();
    else auctionSounds.countdownTick();
  }, []);

  const onAutoCancelled = useCallback(() => {
    setAutoStartSeconds(null);
    setRoomNotice(null);
  }, []);

  const onAutoStarted = useCallback(() => {
    setAutoStartSeconds(null);
    setRoomNotice(null);
  }, []);

  const onStartFailed = useCallback((payload) => {
    setAutoStartSeconds(null);
    setRoomNotice(payload?.message || "Could not auto-start auction");
  }, []);

  const onKicked = useCallback((payload) => {
    alert(payload?.message || "You have been kicked out from this room");
    navigate("/");
  }, [navigate]);

  const onAuctionEnded = useCallback((payload) => {
    setIsAuctionEnding(true);
    setIsStartTransitioning(false);
    setAuction((prev) => ({ ...prev, status: "ENDED", auctionPaused: true }));
    const endedSnapshot = {
      message: payload?.message || "Auction ended",
      teamState: payload?.teamState || {},
      teamRatings: Array.isArray(payload?.teamRatings) ? payload.teamRatings : [],
    };
    setAuctionResult(endedSnapshot);
    saveEndedSnapshot(endedSnapshot);
  }, [saveEndedSnapshot]);

  const onAcceleratedRoundStarted = useCallback((payload) => {
    setAuction((prev) => ({ ...prev, acceleratedRound: payload.acceleratedRound }));
  }, []);

  const onAcceleratedRoundLaunched = useCallback((payload) => {
    setAuction((prev) => ({ ...prev, acceleratedRound: payload.acceleratedRound }));
  }, []);

  const onChatMessage = useCallback((msg) => {
    if (msg) {
      chatQueueRef.current.push(msg);
    }
  }, []);

  const onChatHistory = useCallback((history) => {
    if (Array.isArray(history)) {
      mergeChatHistory(history);
    }
  }, [mergeChatHistory]);

  useEffect(() => {
    if (!isConnectingRoom) return;

    setShowConfetti(false);
    confettiLockUntilRef.current = 0;
    unsoldHoldUntilRef.current = 0;
    unsoldPinnedUntilRef.current = 0;
    setUnsoldPinnedPlayer(null);
    if (unsoldPinTimeoutRef.current) {
      clearTimeout(unsoldPinTimeoutRef.current);
      unsoldPinTimeoutRef.current = null;
    }
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    if (confettiReleaseTimeoutRef.current) clearTimeout(confettiReleaseTimeoutRef.current);
    if (typeof confetti.reset === "function") {
      confetti.reset();
    }
  }, [isConnectingRoom]);

  const canCurrentTeamBid = () => {
    if (!session?.team || !teamState[session.team] || !auction.currentPlayer) {
      return { canBid: true, reason: null };
    }
    
    const team = teamState[session.team];
    const player = auction.currentPlayer;
    
    // Check if current team is already the highest bidder
    if (auction.highestBidder === session.team) {
      return { canBid: false, reason: "same-bidder" };
    }
    
    // Check purse - use next possible bid amount
    const nextBidAmount = auction.highestBid ? auction.highestBid + 0.25 : player.basePrice;
    if (team.purseRemaining < nextBidAmount) {
      return { canBid: false, reason: "not-enough-money" };
    }
    
    // Check max players
    if (team.totalPlayers >= 25) {
      return { canBid: false, reason: "max-players" };
    }
    
    // Check max overseas
    if (player.country && player.country !== "India" && team.overseasCount >= 8) {
      return { canBid: false, reason: "max-overseas" };
    }
    
    return { canBid: true, reason: null };
  };

  // Reset all local room state when roomId changes to prevent leakage from previous sessions
  const resetAllRoomState = useCallback(() => {
    setAuction({
      status: "WAITING",
      roundId: 0,
      currentSet: null,
      currentPlayer: null,
      highestBid: null,
      highestBidder: null,
      auctionPaused: false,
      acceleratedRound: null,
    });
    setTimer(0);
    setTeamState({});
    setTeamInsights({});
    setUsers([]);
    setSeenRoomUsers([]);
    setChatMessages([]);
    setBootstrapSets([]);
    setRoomAuctionType("unknown");
    setAdminUserId(null);
    setIsAcceleratedRound(false);
    setAcceleratedRoundPlayers([]);
    setAutoStartSeconds(null);
    setRoomNotice(null);
    setIsConnectingRoom(true);
    setWarningMessage(null);
    setAuctionResult(null);
    setIsStartTransitioning(false);
    setGoingOnce(false);
    setGoingTwice(false);
    setBidFlash(false);
    setExpandedTeams({});
    setSetIntroName("");
    setSetIntroCountdown(0);
    setNextPlayerText("");
    setPlayerEntryActive(false);
    setIsAdminActionPending(false);
    setIsAuctionEnding(false);
    setIsDismissingAuctionResult(false);
    setShowEndAuctionConfirm(false);

    // Reset Critical Refs
    rejoinAttemptsRef.current = 0;
    roomSyncedRef.current = false;
    currentRoundIdRef.current = 0;
    lastResultEffectAtRef.current = 0;
    lastHammerAtRef.current = 0;
    prevTotalSoldPlayersRef.current = 0;
    lastSoldEventAtRef.current = 0;
    timerStartFloorRef.current = 0;
    timerGuardUntilRef.current = 0;
    timerGuardRoundRef.current = 0;
    confettiLockUntilRef.current = 0;
    unsoldHoldUntilRef.current = 0;
    unsoldPinnedUntilRef.current = 0;
    unsoldPinnedPlayerRef.current = null;
    bidClickLockUntilRef.current = 0;
    
    // Update skipInitialLoadingRef based on location state
    skipInitialLoadingRef.current = Boolean(location.state?.skipLoading === true);
  }, [roomId, location.state?.skipLoading]);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);

    if (!saved) {
      navigate(`/?roomId=${encodeURIComponent((roomId || "").toUpperCase())}`);
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if ((parsed.roomId || "").toUpperCase() !== (roomId || "").toUpperCase()) {
        navigate(`/?roomId=${encodeURIComponent((roomId || "").toUpperCase())}`);
        return;
      }

      // If we got here, we're in the correct room.
      // Trigger a state reset if this is a room transition
      resetAllRoomState();
      setSession(parsed);
    } catch (e) {
      console.error("Session sync error:", e);
      navigate(`/?roomId=${encodeURIComponent((roomId || "").toUpperCase())}`);
    }
  }, [navigate, roomId, resetAllRoomState]);

  useEffect(() => {
    setWarningMessage(null);
  }, [auction.currentPlayer, auction.highestBid, auction.highestBidder]);

  useEffect(() => {
    latestAuctionRef.current = auction;
  }, [auction]);

  useEffect(() => {
    unsoldPinnedPlayerRef.current = unsoldPinnedPlayer;
  }, [unsoldPinnedPlayer]);

  useEffect(() => {
    return () => {
      if (bidDebounceRef.current) clearTimeout(bidDebounceRef.current);
      if (entryTimeoutRef.current) clearTimeout(entryTimeoutRef.current);
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
      if (introIntervalRef.current) clearInterval(introIntervalRef.current);
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
      if (confettiReleaseTimeoutRef.current) clearTimeout(confettiReleaseTimeoutRef.current);
      if (unsoldPinTimeoutRef.current) clearTimeout(unsoldPinTimeoutRef.current);
      if (rejoinRetryTimeoutRef.current) clearTimeout(rejoinRetryTimeoutRef.current);
      if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
      if (dismissNavigationTimeoutRef.current) clearTimeout(dismissNavigationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!auctionResult) {
      setIsDismissingAuctionResult(false);
      setAuctionResultExpandedTeams({});
    }
  }, [auctionResult]);

  const toggleAuctionResultTeamExpanded = useCallback((teamId) => {
    setAuctionResultExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
    setSelectedResultTeam(teamId);
  }, []);

  const dismissAuctionResultToHome = useCallback(() => {
    if (isDismissingAuctionResult) return;
    setIsDismissingAuctionResult(true);

    // Emit deleteRoom event to server before navigating home
    if (roomId) {
      socket.emit("deleteRoom", { roomId });
    }

    if (dismissNavigationTimeoutRef.current) {
      clearTimeout(dismissNavigationTimeoutRef.current);
    }

    dismissNavigationTimeoutRef.current = setTimeout(() => {
      navigate("/", { state: { fromAuction: true } });
    }, 220);
  }, [isDismissingAuctionResult, navigate, roomId]);

  const submitFeedback = useCallback(async () => {
    if (userRating === 0 || isFeedbackSubmitting) return;

    setIsFeedbackSubmitting(true);
    try {
      const response = await fetch(`${SERVER_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: userRating,
          comment: userComment,
          roomId,
          username: session?.name || "Anonymous",
          team: session?.team || "Spectator",
        }),
      });

      if (response.ok) {
        console.log("Feedback submitted successfully");
        setFeedbackSubmitted(true);
        setRoomNotice("Thank you for your feedback!");
        setTimeout(() => setRoomNotice(null), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error("Feedback submission failed:", errData);
        alert(`Failed to submit feedback: ${errData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      alert("Could not connect to the feedback server. Please try again later.");
    } finally {
      setIsFeedbackSubmitting(false);
    }
  }, [userRating, userComment, roomId, session, isFeedbackSubmitting]);

  useEffect(() => {
    if (!auctionResult) {
      setUserRating(0);
      setUserComment("");
      setFeedbackSubmitted(false);
    }
  }, [auctionResult]);

  const handleTeamChange = useCallback((newTeam) => {
    if (!newTeam) return;
    if (session.team === newTeam && !session.isSpectator) return;
    
    socket.emit("changeTeam", { roomId, userId: session.userId, newTeam }, (response) => {
      if (response && response.ok) {
        setSession((prev) => ({ ...prev, team: newTeam, isSpectator: false }));
        try {
          const stored = localStorage.getItem(SESSION_KEY);
          if (stored) {
             const parsed = JSON.parse(stored);
             parsed.team = newTeam;
             parsed.isSpectator = false;
             localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
          }
        } catch(e) {}
      } else {
        setWarningMessage(response?.message || "Failed to join team");
        setTimeout(() => setWarningMessage(null), 3500);
      }
    });
  }, [roomId, session]);

  useEffect(() => {
    const prevStatus = prevAuctionStatusRef.current;
    const currentStatus = auction.status;
    const changed = prevStatus !== currentStatus;
    const recentlyHandled = Date.now() - lastResultEffectAtRef.current < 500;

    if (changed && !recentlyHandled) {
      if (currentStatus === "UNSOLD") {
        triggerUnsoldEffects();
      }
    }

    prevAuctionStatusRef.current = currentStatus;
  }, [auction.status, triggerSoldEffects, triggerUnsoldEffects]);

  useEffect(() => {
    if (!session?.name || !roomId) {
      return;
    }

    setBootstrapSets([]);
    if (skipInitialLoadingRef.current) {
      connectingGateUntilRef.current = Date.now();
      setIsConnectingRoom(false);
    } else {
      connectingGateUntilRef.current = Date.now() + ROOM_RECONNECT_MIN_MS;
      setIsConnectingRoom(true);
    }

    const cachedEndedSnapshot = loadEndedSnapshot();
    if (cachedEndedSnapshot) {
      if (auctionResult) {
        setIsConnectingRoom(false);
        setRoomNotice(null);
        roomSyncedRef.current = true;
        return;
      }

      setIsConnectingRoom(true);
      setRoomNotice(null);
      roomSyncedRef.current = true;
      if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
      hideConnectingTimeoutRef.current = setTimeout(() => {
        setIsAuctionEnding(true);
        setAuctionResult({
          message: cachedEndedSnapshot.message || "Auction ended",
          teamState: cachedEndedSnapshot.teamState || {},
          teamRatings: Array.isArray(cachedEndedSnapshot.teamRatings)
            ? cachedEndedSnapshot.teamRatings
            : [],
        });
        connectingGateUntilRef.current = Date.now();
        setIsConnectingRoom(false);
        setRoomNotice(null);
      }, 2000);
      return () => {
        if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
      };
    }
  }, [auctionResult, hydrateFromRoomState, loadEndedSnapshot, roomId, session]);

  const rejoin = useCallback(() => {
    if (!session || !session.userId || !roomId) return;

    const normalizedRoomId = String(roomId).trim().toUpperCase();

    // Leave the PREVIOUS room if it exists and is different from current
    if (prevRoomIdRef.current && prevRoomIdRef.current !== normalizedRoomId) {
      socket.emit("leaveRoom", { roomId: prevRoomIdRef.current });
    }
    prevRoomIdRef.current = normalizedRoomId;

    const requestId = rejoinRequestIdRef.current + 1;
    rejoinRequestIdRef.current = requestId;

    socket.emit(
      "joinRoom",
      {
        userId: session.userId,
        roomId: normalizedRoomId,
        name: session.name,
        team: session.team || "",
        spectator: !!session.isSpectator,
      },
      (response) => {
        if (requestId !== rejoinRequestIdRef.current) return;
        if (response?.ok) {
          rejoinAttemptsRef.current = 0;
          roomSyncedRef.current = true;
          skipInitialLoadingRef.current = false;
          hydrateFromRoomState(response.room);
          if (Array.isArray(response.chatHistory)) mergeChatHistory(response.chatHistory);
          if (Array.isArray(response.sets)) setBootstrapSets(response.sets);
          requestRoomBootstrap(roomId);
          releaseConnectingOverlay();
          setRoomNotice(null);
          return;
        }

        if (roomSyncedRef.current) {
          releaseConnectingOverlay();
          return;
        }

        const attempt = rejoinAttemptsRef.current + 1;
        rejoinAttemptsRef.current = attempt;
        const message = response?.message || "Room not found";
        const isFatal = message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("expired");

        if (roomSyncedRef.current && auctionResult) {
          releaseConnectingOverlay();
          return;
        }

        if (isFatal) {
          const fallbackEndedSnapshot = loadEndedSnapshot();
          if (fallbackEndedSnapshot) {
            setIsAuctionEnding(true);
            setAuctionResult({
              message: fallbackEndedSnapshot.message || "Auction ended",
              teamState: fallbackEndedSnapshot.teamState || {},
              teamRatings: Array.isArray(fallbackEndedSnapshot.teamRatings) ? fallbackEndedSnapshot.teamRatings : [],
            });
            roomSyncedRef.current = true;
            releaseConnectingOverlay(true);
            setRoomNotice(null);
            return;
          }
          
          if (attempt >= 3) {
            setRoomNotice(`${message}. You may need to create a new room.`);
            // After 3 attempts on a fatal error with no snapshot, stop loading so player can go back
            releaseConnectingOverlay(true); 
            return;
          }
        }

        if (attempt >= 12) {
           setRoomNotice("Connection timed out. Please check your internet or the room code.");
           releaseConnectingOverlay(true);
           return;
        }

        const fastPhase = attempt <= 5;
        const retryDelayMs = fastPhase ? 800 : 2000;
        setIsConnectingRoom(true);
        
        if (window.location.pathname === "/") {
          setIsConnectingRoom(true);
          setRoomNotice("Returning to home page...");
          return;
        } else {
          setRoomNotice(fastPhase ? `Connecting to auction room...` : `${message} Retrying... (${attempt})`);
        }
        
        if (rejoinRetryTimeoutRef.current) clearTimeout(rejoinRetryTimeoutRef.current);
        rejoinRetryTimeoutRef.current = setTimeout(() => {
          rejoin();
        }, retryDelayMs);
      }
    );
  }, [auctionResult, hydrateFromRoomState, loadEndedSnapshot, mergeChatHistory, releaseConnectingOverlay, requestRoomBootstrap, roomId, session]);
    const socketHandlersRef = useRef({});
    socketHandlersRef.current = {
      onTeamUpdate,
      onNewPlayer,
      onBidUpdate,
      onTimerUpdate,
      onChatMessage,
      onChatHistory,
      onPlayerSold,
      onSetIntro,
      onPlayerChange,
      onRoomFranchiseFull,
      onAutoTick,
      onAutoCancelled,
      onAutoStarted,
      onStartFailed,
      onKicked,
      onAuctionEnded,
      onAcceleratedRoundStarted,
      onAcceleratedRoundLaunched,
      onAuctionPausedEvt
    };

    useEffect(() => {
      if (!socket || !roomId) return;
      connectingGateUntilRef.current = Date.now() + 2000;
      rejoin();
      
      const h = (name) => (data) => socketHandlersRef.current[name]?.(data);

      const listeners = {
        connect: rejoin,
        teamUpdate: h("onTeamUpdate"),
        newPlayer: h("onNewPlayer"),
        bidUpdate: h("onBidUpdate"),
        timerUpdate: h("onTimerUpdate"),
        timer: h("onTimerUpdate"),
        chatMessage: h("onChatMessage"),
        chatHistory: h("onChatHistory"),
        playerSold: h("onPlayerSold"),
        roomFranchiseFull: h("onRoomFranchiseFull"),
        auctionAutoStartTick: h("onAutoTick"),
        auctionAutoStartCancelled: h("onAutoCancelled"),
        auctionAutoStarted: h("onAutoStarted"),
        auctionStartFailed: h("onStartFailed"),
        auctionPaused: h("onAuctionPausedEvt"),
        auctionResumed: h("onAuctionPausedEvt"),
        auctionEnded: h("onAuctionEnded"),
        setIntro: h("onSetIntro"),
        playerChange: h("onPlayerChange"),
        kicked: h("onKicked"),
        acceleratedRoundStarted: h("onAcceleratedRoundStarted"),
        acceleratedRoundLaunched: h("onAcceleratedRoundLaunched"),
      };

      Object.entries(listeners).forEach(([evt, fn]) => socket.on(evt, fn));

      const onConnectError = () => {
        setIsConnectingRoom(true);
        setRoomNotice("Reconnecting to auction server...");
      };
      const onReconnect = () => {
        setIsConnectingRoom(true);
        setRoomNotice("Reconnected and synced");
      };
      socket.on("connect_error", onConnectError);
      socket.on("reconnect", onReconnect);

      return () => {
        Object.entries(listeners).forEach(([evt, fn]) => socket.off(evt, fn));
        socket.off("connect_error", onConnectError);
        socket.off("reconnect", onReconnect);
        if (rejoinRetryTimeoutRef.current) clearTimeout(rejoinRetryTimeoutRef.current);
        if (hideConnectingTimeoutRef.current) clearTimeout(hideConnectingTimeoutRef.current);
        if (bootstrapRetryTimeoutRef.current) clearTimeout(bootstrapRetryTimeoutRef.current);
      };
    }, [socket, roomId, rejoin]);

  const sessionAuctionType =
    session?.auctionType === "mini"
      ? "mini"
      : session?.auctionType === "mega"
        ? "mega"
        : "unknown";
  const looksLikeLegacyMiniState = useMemo(() => {
    if (sessionAuctionType !== "mini") return false;
    const teams = Object.values(teamState || {});
    if (teams.length === 0) return false;
    return teams.every((team) => {
      const playersCount = Array.isArray(team?.players) ? team.players.length : 0;
      const totalPlayers = Number(team?.totalPlayers || 0);
      const purseRemaining = Number(team?.purseRemaining || 0);
      return playersCount === 0 && totalPlayers === 0 && purseRemaining === 0;
    });
  }, [sessionAuctionType, teamState]);

  const looksLikeMiniStaleMegaDefaults = useMemo(() => {
    if (sessionAuctionType !== "mini") return false;
    const teams = Object.values(teamState || {});
    if (teams.length === 0) return false;

    return teams.every((team) => {
      const playersCount = Array.isArray(team?.players) ? team.players.length : 0;
      const totalPlayers = Number(team?.totalPlayers || 0);
      const purseRemaining = Number(team?.purseRemaining ?? team?.purse ?? 125);
      return playersCount === 0 && totalPlayers === 0 && Math.abs(purseRemaining - 125) < 0.001;
    });
  }, [sessionAuctionType, teamState]);

  const effectiveAuctionType =
    roomAuctionType === "unknown"
      ? sessionAuctionType
      : looksLikeLegacyMiniState || looksLikeMiniStaleMegaDefaults
        ? "mini"
        : roomAuctionType;

  // Always provide realistic teams for mini auction rooms
  // and attach live autoScore to each team (mini only)
  const displayTeamState = useMemo(() => {
    const unsavedFallback = {};
    
    IPL_TEAMS.forEach(({ id: rawId }) => {
      const id = String(rawId || "").trim().toUpperCase();
      const preset = MINI_SQUAD_PRESETS[id];
      const serverPlayers = Array.isArray(teamState?.[id]?.players) ? teamState[id].players : [];
      const useServer = serverPlayers.length > 0;

      // In MEGA auctions, we ONLY use players bought during the session (serverPlayers).
      // In MINI auctions, we use serverPlayers if available, otherwise fallback to the 2024 preset.
      let playersList = [];
      if (effectiveAuctionType === "mini") {
        playersList = useServer ? serverPlayers : (Array.isArray(preset?.players) ? preset.players.map((player) => ({ ...player })) : []);
      } else {
        playersList = serverPlayers;
      }
      
      const scoreData = calculateMiniTeamScore(playersList, id);
      
      unsavedFallback[id] = {
        ...(teamState?.[id] || {}),
        purse: effectiveAuctionType === "mega"
          ? (teamState?.[id]?.purseRemaining ?? teamState?.[id]?.purse ?? 125)
          : (useServer ? (teamState?.[id]?.purseRemaining ?? teamState?.[id]?.purse ?? preset?.purseRemaining ?? 0) : Number(preset?.purseRemaining || 125)),
        purseRemaining: effectiveAuctionType === "mega"
          ? (teamState?.[id]?.purseRemaining ?? teamState?.[id]?.purse ?? 125)
          : (useServer ? (teamState?.[id]?.purseRemaining ?? teamState?.[id]?.purse ?? preset?.purseRemaining ?? 0) : Number(preset?.purseRemaining || 125)),
        players: playersList,
        totalPlayers: playersList.length,
        overseasCount: playersList.filter(p => p.country && p.country !== "India").length,
        autoScore: { ...scoreData },
      };
    });
    return unsavedFallback;
  }, [effectiveAuctionType, teamState]);

  const auctionResultTeams = useMemo(
    () => {
      const teams = IPL_TEAMS.map(({ id }) => {
        const teamFromResult = auctionResult?.teamState?.[id];
        const teamFromDisplay = displayTeamState?.[id];
        const resultPlayers = Array.isArray(teamFromResult?.players) ? teamFromResult.players : [];
        const displayPlayers = Array.isArray(teamFromDisplay?.players) ? teamFromDisplay.players : [];
        const selectedPlayers = resultPlayers.length > 0 ? resultPlayers : displayPlayers;

        const team = {
          ...(teamFromDisplay || {}),
          ...(teamFromResult || {}),
          players: selectedPlayers,
          totalPlayers: Number(
            teamFromResult?.totalPlayers ??
              teamFromDisplay?.totalPlayers ??
              selectedPlayers.length ??
              0
          ),
        };

        return {
          teamId: id,
          team,
        };
      });

      // SORT: Chosen team (session?.team) always at TOP
      return [...teams].sort((a, b) => {
        if (a.teamId === session?.team) return -1;
        if (b.teamId === session?.team) return 1;
        return 0;
      });
    },
    [auctionResult, displayTeamState, session?.team]
  );

  const auctionResultRatingsInput = useMemo(
    () =>
      auctionResultTeams.map(({ teamId, team }) => {
        const purchasedPlayers = (Array.isArray(team?.players) ? team.players : [])
          .map((player) => ({
            name: String(player?.name || "").trim(),
            role: String(player?.role || "").trim(),
            price: getBoughtPriceNumber(player),
            rating: Number(player?.rating),
          }))
          .filter((player) => Number.isFinite(player.price) && player.price > 0);

        if (purchasedPlayers.length > 0) {
          return {
            name: teamId,
            players: purchasedPlayers,
          };
        }

        return {
          name: teamId,
          players: [],
        };
      }),
    [auctionResultTeams]
  );

  useEffect(() => {
    if (!auctionResult) {
      setAuctionResultRatingsByTeam({});
      setIsAuctionResultRatingsLoading(false);
      setAuctionResultRatingsError("");
      return;
    }

    const payloadRatings = Array.isArray(auctionResult?.teamRatings) ? auctionResult.teamRatings : [];
    if (payloadRatings.length > 0) {
      const nextByTeam = {};
      payloadRatings.forEach((rating) => {
        const key = String(rating?.teamName || "").trim().toUpperCase();
        if (!key) return;
        nextByTeam[key] = rating;
      });
      setAuctionResultRatingsByTeam(nextByTeam);
      setIsAuctionResultRatingsLoading(false);
      setAuctionResultRatingsError("");
      return;
    }

    const localRatingsByTeam = {};
    auctionResultRatingsInput.forEach((team) => {
      const key = String(team?.name || "").trim().toUpperCase();
      if (!key) return;
      localRatingsByTeam[key] = calculateTeamRating(team);
    });

    setAuctionResultRatingsByTeam(localRatingsByTeam);
    setIsAuctionResultRatingsLoading(false);
    setAuctionResultRatingsError("");
  }, [auctionResult, auctionResultRatingsInput]);

  useEffect(() => {
    const ratings = {};
    Object.entries(displayTeamState || {}).forEach(([teamId, team]) => {
      ratings[teamId] = calculateTeamRating({
        name: teamId,
        players: Array.isArray(team?.players) ? team.players : [],
      });
    });
    setLiveTeamRatings(ratings);
  }, [displayTeamState]);

  useEffect(() => {
    if (auctionResult && auctionResultTeams.length > 0) {
      const userTeam = session?.team;
      const foundUserTeam = auctionResultTeams.find(t => t.teamId === userTeam);
      setSelectedResultTeam(foundUserTeam ? userTeam : auctionResultTeams[0].teamId);
    } else {
      setSelectedResultTeam(null);
    }
  }, [auctionResult, auctionResultTeams, session?.team]);

  const topExpensiveBuys = useMemo(() => {
    const soldPlayers = [];

    Object.entries(displayTeamState || {}).forEach(([teamId, team]) => {
      const players = Array.isArray(team?.players) ? team.players : [];
      players.forEach((player) => {
        const soldPrice = Number(player?.soldPrice);
        if (!Number.isFinite(soldPrice) || soldPrice <= 0) return;
        // Pre-auction squad retentions lack dataset IDs. Exclude them from the live Expensive Buys.
        if (!player?.id) return;

        soldPlayers.push({
          name: String(player?.name || "Unknown Player"),
          soldPrice,
          teamId,
          teamFullName: TEAM_FULL_NAMES[teamId] || teamId,
        });
      });
    });

    soldPlayers.sort((a, b) => {
      const priceDiff = b.soldPrice - a.soldPrice;
      if (priceDiff !== 0) return priceDiff;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return soldPlayers.slice(0, 10);
  }, [displayTeamState]);

  const purseSpentRanking = useMemo(() => {
    const teams = Object.entries(displayTeamState || {}).map(([teamId, team]) => {
      const players = Array.isArray(team?.players) ? team.players : [];
      const spent = players.reduce((sum, player) => {
        const price = Number(player?.soldPrice);
        return Number.isFinite(price) && price > 0 ? sum + price : sum;
      }, 0);

      return {
        teamId,
        teamFullName: TEAM_FULL_NAMES[teamId] || teamId,
        spent,
      };
    });

    teams.sort((a, b) => {
      const spentDiff = b.spent - a.spent;
      if (spentDiff !== 0) return spentDiff;
      return a.teamFullName.localeCompare(b.teamFullName, undefined, { sensitivity: "base" });
    });

    return teams;
  }, [displayTeamState]);



  const purse = useMemo(() => {
    if (effectiveAuctionType === "unknown") return 0;
    if (!session?.team || session.isSpectator) return 0;
    return displayTeamState[session.team]?.purseRemaining ?? 0;
  }, [displayTeamState, effectiveAuctionType, session]);

  const displayTeamPurse = useCallback(
    (team) => (effectiveAuctionType === "unknown" ? 0 : Number(team?.purseRemaining ?? 0)),
    [effectiveAuctionType]
  );

  const currentBidDisplayValue = typeof animatedHighestBid === "number" ? animatedHighestBid : auction.highestBid;

  const placeBid = useCallback((event) => {
    const clickTs = Date.now();
    if (clickTs < bidClickLockUntilRef.current) {
      return;
    }
    bidClickLockUntilRef.current = clickTs + 220;

    setWarningMessage(null); // Clear any previous warning

    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setBidRipple({
        show: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      setTimeout(() => setBidRipple((prev) => ({ ...prev, show: false })), 360);
    }
    setBidPulse(true);
    setTimeout(() => setBidPulse(false), 170);
    auctionSounds.bidClick();
    
    // Client-side check to prevent same team from bidding twice
    if (auction.highestBidder === session.team) {
      setWarningMessage("Same team cannot bid consecutively");
      return;
    }
    
    socket.emit(
      "placeBid",
      {
        roomId,
        clientBidTs: Date.now(),
      },
      (response) => {
        if (!response?.ok) {
          let message = "Bid failed";
          if (response?.reason === "NOT_ENOUGH_MONEY") {
            message = "Not enough money";
          } else if (response?.reason === "MAX_PLAYERS_REACHED") {
            message = "Max player limit reached";
          } else if (response?.reason === "MAX_OVERSEAS_REACHED") {
            message = "Max overseas limit reached";
          } else if (response?.message) {
            // Use server message as fallback for other errors
            message = response.message;
          }
          setWarningMessage(message);
        }
      }
    );
  }, [auction.highestBidder, roomId, session?.team]);

  const downloadSquad = useCallback(async (teamId, source = "live") => {
    // We now target the persistent off-screen snapshot for maximum reliability
    const id = `snapshot-squad-${teamId}`;
    const element = document.getElementById(id);
    if (!element) {
      setRoomNotice("Could not find squad to capture.");
      setTimeout(() => setRoomNotice(null), 1500);
      return;
    }
    setRoomNotice(`Capturing ${teamId} squad...`);
    const res = await handleCapture(element, { fileName: `IPL_Squad_${teamId}`, action: "download" });
    setRoomNotice(res.ok ? "Downloaded successfully" : res.message);
  }, []);

  const shareSquadAction = useCallback(async (teamId, source = "live") => {
    const id = `snapshot-squad-${teamId}`;
    const element = document.getElementById(id);
    if (!element) {
      setRoomNotice("Could not find squad to capture.");
      setTimeout(() => setRoomNotice(null), 1500);
      return;
    }
    setRoomNotice(`Preparing ${teamId} share...`);
    const res = await handleCapture(element, { fileName: `IPL_Squad_${teamId}`, action: "share" });
    if (!res.ok) {
       setRoomNotice(res.message);
       setTimeout(() => setRoomNotice(null), 2500);
    } else {
       setRoomNotice(null);
    }
  }, []);

  const downloadSummaryBoard = useCallback(async () => {
    const element = document.getElementById("auction-result-summary");
    if (!element) {
      setRoomNotice("Could not find results to capture.");
      setTimeout(() => setRoomNotice(null), 1500);
      return;
    }
    setRoomNotice("Capturing full summary...");
    const res = await handleCapture(element, { 
      fileName: `IPL_Auction_Results`, 
      action: "download",
      title: "IPL Auction Final Results",
      text: "Check out the final standings of our IPL Auction!"
    });
    setRoomNotice(res.ok ? "Downloaded summary successfully" : res.message);
  }, []);

  const shareSummaryBoard = useCallback(async () => {
    const element = document.getElementById("auction-result-summary");
    if (!element) {
      setRoomNotice("Could not find results to share.");
      setTimeout(() => setRoomNotice(null), 1500);
      return;
    }
    setRoomNotice("Preparing full summary for share...");
    const res = await handleCapture(element, { 
      fileName: `IPL_Auction_Results`, 
      action: "share",
      title: "IPL Auction Final Results",
      text: "Check out the final standings of our IPL Auction!"
    });
    if (!res.ok) {
       setRoomNotice(res.message);
       setTimeout(() => setRoomNotice(null), 2500);
    } else {
       setRoomNotice(null);
    }
  }, []);

  const sendChat = useCallback((message) => {
    socket.emit("sendChatMessage", { roomId, message }, () => {});
  }, [roomId]);

  const copyShareLink = useCallback(async () => {
    const shareUrl = `${window.location.origin}/auction/${roomId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setRoomNotice("Share link copied to clipboard");
    } catch {
      setRoomNotice(shareUrl);
    }
  }, [roomId]);

  const goHomeAndLeaveRoom = useCallback(() => {
    setIsLeavingToHome(true);
    let navigated = false;
    const safeNavigateHome = () => {
      if (navigated) return;
      navigated = true;
      navigate("/", { state: { fromAuction: true } });
    };

    socket.emit("leaveRoom", { roomId }, () => {
      safeNavigateHome();
    });

    // Fallback navigation in case ack is delayed.
    setTimeout(safeNavigateHome, 450);
  }, [navigate, roomId]);

  const handleStartAuction = useCallback(() => {
    if (isAdminActionPending || isStartTransitioning) return;

    setIsAdminActionPending(true);
    setIsStartTransitioning(true);

    const payload = {
      roomId,
      timerSeconds: auction.timerConfigSeconds ?? 10,
      accelerated: !!auction.accelerated,
      acceleratedTimerSeconds: auction.acceleratedTimerSeconds ?? 3,
    };

    socket.emit("startAuction", payload, (res) => {
      if (!res?.ok) {
        setIsStartTransitioning(false);
        setRoomNotice(res?.message || "Could not start auction");
        setTimeout(() => setRoomNotice(null), 2000);
      }
      setIsAdminActionPending(false);
    });
  }, [auction.timerConfigSeconds, auction.accelerated, auction.acceleratedTimerSeconds, isAdminActionPending, isStartTransitioning, roomId]);

  const pauseAuction = useCallback(() => {
    if (isAdminActionPending) return;
    setIsAdminActionPending(true);
    socket.emit("pauseAuction", { roomId }, (res) => {
      if (!res?.ok) {
        setRoomNotice(res?.message || "Could not pause auction");
      }
      setIsAdminActionPending(false);
    });
  }, [isAdminActionPending, roomId]);

  const resumeAuction = useCallback(() => {
    if (isAdminActionPending) return;
    setIsAdminActionPending(true);
    socket.emit("resumeAuction", { roomId }, (res) => {
      if (!res?.ok) {
        setRoomNotice(res?.message || "Could not resume auction");
      }
      setIsAdminActionPending(false);
    });
  }, [isAdminActionPending, roomId]);

  useEffect(() => {
    const refreshNetworkSignal = () => {
      const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
      const socketConnected = socket.connected === true;
      const connection = getConnectionApi();
      const effectiveType = connection?.effectiveType;
      const downlink = Number(connection?.downlink);
      const rtt = Number(connection?.rtt);

      const level = resolveSignalLevel({
        online,
        socketConnected,
        effectiveType,
        downlink,
        rtt,
      });

      const label = level === "green" ? "Strong" : level === "yellow" ? "Moderate" : "Weak";
      let detail = "";
      if (!online || !socketConnected) {
        detail = "Offline";
      } else if (Number.isFinite(rtt) && rtt > 0) {
        detail = `${Math.round(rtt)}ms`;
      } else if (effectiveType) {
        detail = String(effectiveType).toUpperCase();
      }

      setNetworkSignal({ level, label, detail });
    };

    refreshNetworkSignal();
    const intervalId = setInterval(refreshNetworkSignal, 2000);

    const onOnline = () => refreshNetworkSignal();
    const onOffline = () => refreshNetworkSignal();
    const onSocketConnect = () => refreshNetworkSignal();
    const onSocketDisconnect = () => refreshNetworkSignal();
    const onSocketReconnect = () => refreshNetworkSignal();
    const onSocketError = () => refreshNetworkSignal();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("reconnect", onSocketReconnect);
    socket.on("connect_error", onSocketError);

    const connection = getConnectionApi();
    connection?.addEventListener?.("change", refreshNetworkSignal);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
      socket.off("reconnect", onSocketReconnect);
      socket.off("connect_error", onSocketError);
      connection?.removeEventListener?.("change", refreshNetworkSignal);
    };
  }, []);

  useEffect(() => {
    if (!showTopMenuPanel) return;

    const handlePointerDown = (event) => {
      if (!topMenuRef.current) return;
      if (!topMenuRef.current.contains(event.target)) {
        setShowTopMenuPanel(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowTopMenuPanel(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showTopMenuPanel]);

  useEffect(() => {
    if (!showTopMenuPanel) {
      setShowExpensiveBuys(false);
      setShowPurseSpentByTeams(false);
    }
  }, [showTopMenuPanel]);

  useEffect(() => {
    setSeenRoomUsers([]);
  }, [roomId]);

  useEffect(() => {
    if (!Array.isArray(users) || users.length === 0) return;

    setSeenRoomUsers((prev) => {
      const byId = new Map(prev.map((u) => [u.userId, u]));
      users.forEach((u) => {
        if (!u?.userId) return;
        byId.set(u.userId, { ...byId.get(u.userId), ...u });
      });
      return Array.from(byId.values());
    });
  }, [users]);

  useEffect(() => {
    if (!showActivePeoplePanel) return;

    const handlePointerDown = (event) => {
      if (!activePeopleRef.current) return;
      if (!activePeopleRef.current.contains(event.target)) {
        setShowActivePeoplePanel(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowActivePeoplePanel(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showActivePeoplePanel]);

  if (!session) return null;

  if (isLeavingToHome || (isConnectingRoom && window.location.pathname === "/")) {
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
            Returning to home page...
          </span>
        </div>
      </div>
    );
  }
  if (isConnectingRoom) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(11,18,32,0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '3px solid rgba(34,211,238,0.2)',
              borderTopColor: '#22d3ee',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
              {roomNotice || "Connecting to auction room..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(11,18,32,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#fff',
        gap: '24px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Session not found</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '400px' }}>
          We couldn't retrieve your auction session or the room has expired.
        </p>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            background: '#22d3ee', color: '#000', padding: '12px 24px', 
            borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' 
          }}
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  // If retries failed and isConnectingRoom was released, show the notice with a button
  if (roomNotice && (roomNotice.includes("not exist") || roomNotice.includes("expired") || roomNotice.includes("timed out"))) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(11,18,32,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#fff',
        gap: '24px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Auction Room Unavailable</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '400px' }}>
          {roomNotice}
        </p>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            background: '#22d3ee', color: '#000', padding: '12px 24px', 
            borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer' 
          }}
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const isSpectator = session.isSpectator === true;
  const franchisePlayerCount = users.filter(u => !u.isSpectator).length;
  const activeUsers = users || [];
  const activeUserIds = new Set(activeUsers.map((u) => u?.userId).filter(Boolean));
  const inactiveUsers = (seenRoomUsers || []).filter((u) => u?.userId && !activeUserIds.has(u.userId));
  const isSetIntroActive = Boolean(setIntroName) && setIntroCountdown > 0;
  const suppressWaitingText = isStartTransitioning || isSetIntroActive;
  const isUnsoldDelayActive =
    (auction.status === "DELAY" || auction.status === "UNSOLD") &&
    lastRoundResult === "UNSOLD";
  const displayPlayer = isSetIntroActive
    ? null
    : (auction.currentPlayer || unsoldPinnedPlayer || (isUnsoldDelayActive ? lastResultPlayer : null));
  const shouldShowNextPlayerBanner =
    Boolean(nextPlayerText) &&
    nextPlayerText.trim().toLowerCase() !== "next player" &&
    !isSetIntroActive &&
    (timer <= 3 || isUnsoldDelayActive);
  const playerCardStatus =
    auction.status === "DELAY"
      ? (lastRoundResult === "SOLD" || lastRoundResult === "UNSOLD" ? lastRoundResult : "RUNNING")
      : auction.status;
  const resultBadge = (isSetIntroActive || isStartTransitioning)
    ? null
    : (auction.status === "SOLD" || auction.status === "UNSOLD")
      ? auction.status
      : lastRoundResult;
  const isAdmin = session.role === "admin";
  const isHost = session?.userId === adminUserId;
  const hostUser = (users || []).find((u) => u?.userId === adminUserId);
  const hostTeamId = hostUser?.team || null;
  const bidEligibility = canCurrentTeamBid();
  const signal3dClass =
    networkSignal.level === "green"
      ? "icon-3d-emerald text-emerald-200"
      : networkSignal.level === "yellow"
        ? "icon-3d-amber text-amber-200"
        : "icon-3d-rose text-rose-200";

  return (
    <main
      className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col"
      onPointerDownCapture={unlockAudio}
      onKeyDownCapture={unlockAudio}
    >
      <ConfettiBurst key={confettiBurstId} active={showConfetti} />

      {/* Notices */}
      {(roomNotice || autoStartSeconds != null) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 rounded-2xl border border-amber-500/40 bg-amber-950/90 backdrop-blur-sm px-6 py-4 text-sm text-amber-100 z-50">
          {roomNotice ? <p>{roomNotice}</p> : null}
          {autoStartSeconds != null ? (
            <p className="mt-1 font-mono text-lg font-bold">
              Auto-start in {autoStartSeconds}s
            </p>
          ) : null}
        </div>
      )}

      {/* Top Bar */}
      {!isAuctionEnding ? (
      <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-line bg-panel/80 backdrop-blur-sm px-6 py-4 relative">
        <div className="flex items-center gap-6">
          {displayPlayer ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-6">
                <div>
                  <h1 className="text-2xl font-bold text-glow">{displayPlayer.name}</h1>
                  <p className="text-sm text-slate-300">{displayPlayer.role} • {displayPlayer.country}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Base Price</p>
                  <p className="price-font text-lg font-semibold whitespace-nowrap">₹{formatAmount(displayPlayer.basePrice)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Current Bid</p>
                  <p
                    className={`price-font text-xl font-bold text-amber-400 whitespace-nowrap transition-transform duration-300 ease-out ${bidAmountPop ? "animate-bid-amount-pop" : ""}`}
                  >
                    {currentBidDisplayValue != null ? `₹${formatAmount(currentBidDisplayValue)}` : "-"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Leading Team</p>
                  <p className="text-lg font-semibold text-cyan-300">{auction.highestBidder || "None"}</p>
                </div>
              </div>
              <div className="text-xs font-semibold tracking-wide text-cyan-100 w-fit">
                Room: {String(roomId || "").toUpperCase()}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold">IPL Auction Room {roomId}</h1>
              <p className="text-sm text-slate-300">
                {session.name}
                {isSpectator ? (
                  <span className="text-cyan-300"> (Spectator)</span>
                ) : (
                  <>
                    {" "}
                    ({session.team}) • Purse: ₹{formatAmount(purse)}
                  </>
                )}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Timer</p>
            <p className={`inline-block text-2xl font-bold leading-tight ${auction.status === 'RUNNING' && timer <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{auction.status === 'WAITING' ? '--' : `${timer}s`}</p>
          </div>
          <div ref={activePeopleRef} className="relative flex flex-col items-center justify-center gap-0" title="Players in Auction">
            <button
              type="button"
              onClick={() => setShowActivePeoplePanel((prev) => !prev)}
              className={`icon-3d-btn icon-3d-cyan inline-flex h-11 w-11 items-center justify-center text-slate-100`}
              title="Active people"
            >
              <PeopleIcon />
            </button>
            <span className="-mt-2 text-xs font-bold leading-none text-cyan-300">{franchisePlayerCount}/10</span>
            {showActivePeoplePanel && (
              <div className="absolute left-1/2 top-full z-[160] mt-2 w-60 -translate-x-1/2 rounded-2xl border border-cyan-500/35 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-sm">
                <ScrollWrapper className="space-y-2 pr-1" maxHeight="18rem">
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wide text-cyan-200">Active Players</p>
                    {activeUsers.length === 0 ? (
                      <p className="text-xs text-slate-400">No active users.</p>
                    ) : (
                      activeUsers.map((user) => {
                        const teamLabel = user?.isSpectator ? "SPEC" : (user?.team || "NA");
                        return (
                          <div key={user.userId || `${user.name}-${teamLabel}`} className="mb-1 flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-100 last:mb-0">
                            {teamLabel !== "SPEC" && teamLabel !== "NA" ? (
                              <></>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-600/80 bg-slate-800/80 text-[10px] font-semibold text-slate-200">
                                {teamLabel}
                              </span>
                            )}
                            <span className="truncate">{`${user?.name || "Unknown"} (${teamLabel})`}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wide text-amber-200">Inactive Players</p>
                    {inactiveUsers.length === 0 ? (
                      <p className="text-xs text-slate-400">No inactive users.</p>
                    ) : (
                      inactiveUsers.map((user) => {
                      const teamLabel = user?.isSpectator ? "SPEC" : (user?.team || "NA");
                      return (
                        <div key={`inactive-${user.userId || `${user.name}-${teamLabel}`}`} className="mb-1 flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 last:mb-0">
                          {teamLabel !== "SPEC" && teamLabel !== "NA" ? (
                            <></>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-600/80 bg-slate-800/80 text-[10px] font-semibold text-slate-200">
                              {teamLabel}
                            </span>
                          )}
                          <span className="truncate">{`${user?.name || "Unknown"} (${teamLabel})`}</span>
                        </div>
                      );
                    })
                    )}
                  </div>
                </ScrollWrapper>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center justify-center gap-0.5" title="Live internet signal">
            <div className={`icon-3d-btn icon-3d-signal ${signal3dClass}`}>
              <InternetSignalIcon level={networkSignal.level} />
            </div>
            <span className="text-[10px] font-semibold leading-none text-slate-300">
              {networkSignal.detail || "--"}
            </span>
          </div>
          <ShareMenu roomId={String(roomId || "").toUpperCase()} />
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="icon-3d-btn icon-3d-cyan inline-flex h-11 w-11 items-center justify-center text-cyan-100"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 transition-transform hover:scale-110 drop-shadow-md">
                <defs>
                  <linearGradient id="mute-speaker-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <linearGradient id="mute-x-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                </defs>
                {/* 3D Speaker Body */}
                <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="url(#mute-speaker-grad)" stroke="#1e293b" strokeWidth="0.5"/>
                <path d="M11 5L11.5 5.5V18.5L11 19V5Z" fill="#334155" />
                {/* 3D X */}
                <path d="M22 9L16 15M16 9L22 15" stroke="url(#mute-x-grad)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M22 9.5L16.5 15M16.5 9.5L22 15.5" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeLinecap="round" transform="translate(1,1)" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 transition-transform hover:scale-110 drop-shadow-md">
                <defs>
                  <linearGradient id="speaker-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                  <radialGradient id="wave-glow">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* 3D Speaker Body */}
                <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="url(#speaker-grad)" stroke="#0c4a6e" strokeWidth="0.5"/>
                <path d="M11 5L11.5 5.5V18.5L11 19V5Z" fill="#075985" />
                {/* 3D Waves with Glow */}
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" filter="drop-shadow(0 0 2px #22d3ee)" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </svg>
            )}
          </button>
          {resultBadge === "SOLD" && (
            <div className="rounded-full bg-green-500 px-6 py-2 text-sm font-bold uppercase text-white animate-pulse drop-shadow-lg">
              SOLD
            </div>
          )}
          {resultBadge === "UNSOLD" && !auction.acceleratedComplete && (
            <div className="rounded-full bg-red-500 px-6 py-2 text-sm font-bold uppercase text-white animate-pulse drop-shadow-lg">
              UNSOLD
            </div>
          )}
           {isAdmin && (
             <div className="flex gap-2">
              {auction.status === "WAITING" && !auction.hasStarted && !isStartTransitioning && !isSetIntroActive && (
                 <button
                  type="button"
                  onClick={handleStartAuction}
                  disabled={isAdminActionPending || isStartTransitioning}
                  className="rounded-xl bg-glow px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdminActionPending ? "Starting..." : "Start Auction"}
                </button>
              )}

              {(auction.status === "RUNNING" || auction.auctionPaused || auction.acceleratedComplete) && auction.status !== "ENDED" && isHost && (
                <>
                  {!auction.acceleratedComplete && (
                    auction.auctionPaused ? (
                      <button
                        type="button"
                        onClick={resumeAuction}
                        disabled={isAdminActionPending}
                        className="icon-3d-btn icon-3d-emerald inline-flex h-11 w-11 translate-y-0.5 items-center justify-center text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Resume Auction"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`h-6 w-6 ${isAdminActionPending ? "opacity-80" : ""}`} fill="none" aria-hidden="true">
                          <path d="M7 5.5c0-1.1 1.2-1.8 2.1-1.3l9.2 5.3c1 .6 1 2 0 2.6l-9.2 5.3c-.9.5-2.1-.2-2.1-1.3V5.5z" fill="currentColor" />
                          <path d="M8.2 6.4 15.9 10.5" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pauseAuction}
                        disabled={isAdminActionPending}
                        className="icon-3d-btn icon-3d-amber inline-flex h-11 w-11 translate-y-0.5 items-center justify-center text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Pause Auction"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`h-6 w-6 ${isAdminActionPending ? "opacity-80" : ""}`} fill="none" aria-hidden="true">
                          <rect x="6.4" y="4.8" width="4" height="14.4" rx="1.1" fill="currentColor" />
                          <rect x="13.6" y="4.8" width="4" height="14.4" rx="1.1" fill="currentColor" />
                          <path d="M7.3 6.3v11.4M14.5 6.3v11.4" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1" />
                        </svg>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setShowEndAuctionConfirm(true)}
                    disabled={isAdminActionPending}
                    className="icon-3d-btn icon-3d-rose inline-flex h-11 w-11 items-center justify-center text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title="End Auction"
                  >
                    {isAdminActionPending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200/25 border-t-rose-200" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                        <defs>
                          <linearGradient id="stop-3d-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fecdd3" />
                            <stop offset="55%" stopColor="#fb7185" />
                            <stop offset="100%" stopColor="#9f1239" />
                          </linearGradient>
                          <filter id="stop-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#4c0519" floodOpacity="0.72" />
                          </filter>
                        </defs>
                        <rect x="5.5" y="5.5" width="13" height="13" rx="2.6" fill="url(#stop-3d-grad)" filter="url(#stop-3d-shadow)" />
                        <rect x="7.2" y="7.1" width="9.2" height="1.2" rx="0.6" fill="#ffffff" opacity="0.28" />
                      </svg>
                    )}
                  </button>

                  {!isAcceleratedRound && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminActionPending(true);
                        socket.emit("startAcceleratedRound", { roomId }, (response) => {
                          setIsAdminActionPending(false);
                          if (response && !response.ok) {
                            setWarningMessage(response.message);
                            setTimeout(() => setWarningMessage(null), 2000);
                            console.warn("Accelerated Round failed:", response.message);
                          }
                        });
                      }}
                      disabled={isAdminActionPending}
                      className="icon-3d-btn icon-3d-indigo inline-flex h-11 px-3 items-center justify-center text-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 gap-1 overflow-hidden ml-2"
                      title="Start Accelerated Round"
                    >
                      <span className="text-lg drop-shadow-md">⚡</span>
                      <span className="font-bold text-xs uppercase tracking-wider">Accelerated</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={goHomeAndLeaveRoom}
            className="icon-3d-btn icon-3d-cyan inline-flex h-11 w-11 items-center justify-center text-slate-100"
            title="Home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="home-3d-roof" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="55%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="home-3d-body" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="55%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#0e7490" />
                </linearGradient>
                <filter id="home-3d-shadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#082f49" floodOpacity="0.65" />
                </filter>
              </defs>
              <path d="M3.8 10.3 12 3.6l8.2 6.7" stroke="url(#home-3d-roof)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" filter="url(#home-3d-shadow)" />
              <path d="M6.1 9.8v10.3h11.8V9.8" fill="url(#home-3d-body)" stroke="#0e7490" strokeOpacity="0.6" strokeWidth="0.8" filter="url(#home-3d-shadow)" />
              <rect x="10.2" y="13.1" width="3.6" height="7" rx="1" fill="#0e7490" opacity="0.45" />
              <path d="M7.2 10.9h9.6" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1" />
            </svg>
          </button>
          <div ref={topMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowTopMenuPanel((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/40 transition-colors"
              title="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {showTopMenuPanel && (
              <>
                <div className="absolute right-0 top-12 z-[160] w-72 rounded-2xl border border-slate-600/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-sm">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowExpensiveBuys((prev) => !prev)}
                      className="w-full rounded-xl border border-cyan-500/35 bg-slate-800/70 p-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-cyan-200">Expensive Buys</p>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-cyan-300 transition-transform ${showExpensiveBuys ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </div>
                    </button>

                    {showExpensiveBuys && (
                      <ScrollWrapper className="space-y-2 rounded-xl border border-cyan-500/25 bg-slate-950/60 p-2" maxHeight="18rem">
                        {topExpensiveBuys.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-slate-400">No sold players yet.</p>
                        ) : (
                          topExpensiveBuys.map((entry, index) => (
                            <div key={`${entry.name}-${entry.teamId}-${index}`} className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-2 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-semibold text-cyan-100">{index + 1}. {entry.name}</p>
                                <p className="price-font shrink-0 text-xs font-bold text-emerald-300">₹{formatAmount(entry.soldPrice)}</p>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-300">{entry.teamFullName}</p>
                            </div>
                          ))
                        )}
                      </ScrollWrapper>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowPurseSpentByTeams((prev) => !prev)}
                      className="w-full rounded-xl border border-amber-500/35 bg-slate-800/70 p-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-amber-200">Purse spent by Teams</p>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-amber-300 transition-transform ${showPurseSpentByTeams ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </div>
                    </button>

                    {showPurseSpentByTeams && (
                      <ScrollWrapper className="space-y-2 rounded-xl border border-amber-500/25 bg-slate-950/60 p-2" maxHeight="18rem">
                        {purseSpentRanking.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-slate-400">No team data yet.</p>
                        ) : (
                          purseSpentRanking.map((entry, index) => (
                            <div key={`${entry.teamId}-${index}`} className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-2 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-semibold text-amber-100">{index + 1}. {entry.teamFullName}</p>
                                <p className="price-font shrink-0 text-xs font-bold text-amber-300">₹{formatAmount(entry.spent)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </ScrollWrapper>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      ) : null}


      {isSpectator && !isAuctionEnding && (
        <SpectatorTeamSelect
          users={users}
          teamState={teamState}
          roomAuctionType={roomAuctionType}
          handleTeamChange={handleTeamChange}
        />
      )}



      {/* Main Content */}
      <ScrollWrapper className="flex-1 overflow-x-hidden min-h-0">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 p-6 min-h-full">
        {/* Left: Player Spotlight + Tabs Panel */}
        <div className="space-y-4 flex flex-col">
          {isAcceleratedRound && (
             <div className="w-full rounded-2xl border-2 border-indigo-400 bg-indigo-950/80 p-4 shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-slide-down relative overflow-hidden backdrop-blur-md">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/20 to-indigo-500/10 animate-pulse" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/50">
                      <span className="text-2xl drop-shadow-md">⚡</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider text-glow">Accelerated Round</h3>
                      <p className="text-xs text-indigo-200">Quick bidding for {acceleratedRoundPlayers.length} unsold players</p>
                    </div>
                  </div>
                  <div className="hidden sm:block px-4 py-1.5 rounded-full bg-indigo-900 border border-indigo-500/50 text-indigo-300 text-xs font-semibold whitespace-nowrap">
                    All Teams Pool
                  </div>
                </div>
             </div>
          )}
          <div className={`flex items-center justify-center w-full pt-12 ${playerEntryActive ? 'player-entry-anim' : ''} ${playerFadeOut ? 'player-fade-anim' : ''}`}>
            {!isSetIntroActive ? (
              auction.acceleratedComplete ? (
                <div className="flex flex-col items-center justify-center py-12 px-12 w-fit max-w-[95vw] rounded-3xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-sm shadow-2xl">
                  <span className="text-xl md:text-3xl font-black text-slate-100 tracking-tight text-glow text-center p-4 whitespace-nowrap">
                    {auction.statusMessage || "Accelerated Round Completed"}
                  </span>
                </div>
              ) : (
                <PlayerCard
                  player={displayPlayer}
                  currentSet={auction.currentSet}
                  status={playerCardStatus}
                  statusMessage={auction.statusMessage}
                  soldHighlightActive={soldHighlightActive}
                  hideWaitingText={suppressWaitingText}
                  goingOnce={goingOnce}
                  goingTwice={goingTwice}
                  actionButton={(
                <button
                  type="button"
                  disabled={
                    auction.status !== "RUNNING" ||
                    isSpectator ||
                    auction.auctionPaused ||
                    !bidEligibility.canBid
                  }
                  onClick={placeBid}
                  className={`relative w-full overflow-hidden rounded-xl bg-glow px-6 py-4 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-50 transition-transform duration-150 hover:scale-[1.02] active:scale-95 ${bidPulse ? 'bid-button-pop' : ''}`}
                >
                  {bidRipple.show ? (
                    <span
                      className="bid-ripple"
                      style={{ left: bidRipple.x, top: bidRipple.y }}
                    />
                  ) : null}
                  {isSpectator
                    ? "Spectating - bidding disabled"
                    : auction.auctionPaused
                      ? "Auction Paused"
                      : auction.highestBidder === session.team
                        ? "Already Bidding - Wait"
                        : !bidEligibility.canBid
                          ? (() => {
                              const reason = bidEligibility.reason;
                              if (reason === "max-players") return "Max players reached";
                              if (reason === "max-overseas") return "Max overseas reached";
                              if (reason === "not-enough-money") return "Not enough money";
                              return "Cannot Bid";
                            })()
                          : "PLACE BID"}
                </button>
                )}
                />
              )
            ) : null}
          </div>

          <div className="h-10 w-full flex items-center justify-center">
            {shouldShowNextPlayerBanner ? (
              <div className="rounded-xl border border-indigo-300/40 bg-indigo-950/70 px-5 py-2 text-sm font-semibold text-indigo-100 next-player-banner text-center w-fit">
                {nextPlayerText}
              </div>
            ) : isSetIntroActive ? (
              <div className="pointer-events-none mx-auto w-fit rounded-2xl border border-cyan-400/40 bg-cyan-950/75 px-6 py-3 text-lg font-semibold text-cyan-100 intro-banner">
                Coming Up: {setIntroName} · {setIntroCountdown}s
              </div>
            ) : null}
          </div>

          <div className={`rounded-2xl border border-line bg-panel p-4 h-auto min-h-[100px] flex flex-col shadow-xl ${bidFlash ? 'animate-bid-flash' : ''}`}>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4 border-b border-line pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap ${
                  activeTab === "chat"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-slate-400 hover:text-white"
                }`}
              >
                Live Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("squads")}
                className={`px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap ${
                  activeTab === "squads"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-slate-400 hover:text-white"
                }`}
              >
                Squads
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap ${
                  activeTab === "settings"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-slate-400 hover:text-white"
                }`}
              >
                Settings
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "chat" && (
              <ChatPanel chatMessages={chatMessages} onSend={sendChat} compact roomId={roomId} />
            )}
            {activeTab === "squads" && (
              <div className="flex-1 flex flex-col min-h-0 bg-panel border border-line rounded-2xl p-4">
                <h2 className="text-lg font-bold mb-4 text-glow">Squads</h2>
                <ScrollWrapper className="flex-1 min-h-0 py-2">
                  {[...IPL_TEAMS].sort((a, b) => {
                    if (a.id === session?.team) return -1;
                    if (b.id === session?.team) return 1;
                    return 0;
                  }).map(({ id: teamId }) => {
                    const team = teamState[teamId] || {};
                    const players = Array.isArray(team.players) ? team.players : [];
                    const isExpanded = !!expandedTeams[teamId];
                    const isMyTeam = teamId === session?.team;

                    return (
                      <div key={teamId} className={`mb-3 last:mb-0 rounded-2xl border transition-all ${isMyTeam ? "border-amber-500/40 bg-amber-950/5 ring-1 ring-amber-500/10 shadow-sm" : "border-line bg-panel-top hover:border-slate-700"} overflow-hidden`}>
                        <div
                          onClick={() => setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }))}
                          className="p-3 transition-all cursor-pointer hover:bg-slate-700/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                              {(() => {
                                const teamObj = IPL_TEAMS.find(t => t.id === teamId);
                                const logoUrl = teamObj && teamObj.logoUrls && teamObj.logoUrls.length > 0 ? teamObj.logoUrls[0] : null;
                                return logoUrl ? (
                                  <img src={logoUrl} alt={teamId} className="h-6 w-6 object-contain rounded-md mr-1" style={{ imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }} />
                                ) : (
                                  <span className="h-6 w-6 flex items-center justify-center bg-slate-700 rounded-md text-xs font-bold text-white mr-1" style={{ imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }}>{teamId}</span>
                                );
                              })()}
                              <span className="font-semibold text-white">
                                {teamId}
                                {isMyTeam ? <span className="ml-1 text-cyan-300">(You)</span> : null}
                                {hostTeamId === teamId ? <span className="ml-1 text-amber-300" title="Host">👑</span> : null}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="price-font text-sm text-slate-300 whitespace-nowrap">₹{formatAmount(displayTeamPurse(team))}</span>
                            </div>
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 flex justify-between">
                            <span>Players: {team.totalPlayers || players.length} • Overseas: {team.overseasCount || players.filter(p => p.country && p.country !== "India").length}</span>
                            <span className="text-cyan-400 opacity-60">Click to expand</span>
                          </div>
                        </div>
                        
                        {/* Per-team unique analyst insights */}
                        <div className="px-3 pb-3">
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/20 p-2">
                            <div className="flex items-center justify-between text-xs text-emerald-200">
                              <span>Auto Score: {team.autoScore?.overall?.toFixed(2) || "0.00"}/5</span>
                              <AnimatedScoreStars score={team.autoScore?.overall || 0} />
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-200">
                              <span className="opacity-70">Batting:</span>
                              <AnimatedScoreStars score={team.autoScore?.batting || 0} />
                              <span className="opacity-70">Bowling:</span>
                              <AnimatedScoreStars score={team.autoScore?.bowling || 0} />
                            </div>
                            {(() => {
                              const insights = teamInsights[teamId] || generateTeamInsights(players, teamId, teamInsights);
                              return (
                                <p className="mt-1 text-[10px] text-cyan-200 uppercase tracking-tight">
                                  {insights.fullText || `${insights.pros} • ${insights.cons}`}
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        {isExpanded && (
                          <div id={`live-squad-${teamId}`} className="mt-2 mx-3 space-y-2 border-l-2 border-blue-500/40 pl-3 pb-3 bg-slate-900/40 rounded-br-xl">
                            <div className="flex items-center gap-2 py-2 mb-1 border-b border-white/5">
                              <TeamLogoBadge teamId={teamId} size="xs" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{teamId} SQUAD</span>
                            </div>
                            {players.length > 0 ? (
                              players.map((player, idx) => {
                                const rawPrice = player.soldPrice;
                                const basePrice = player.basePrice;
                                let finalPrice = Number(rawPrice);
                                if (!finalPrice || finalPrice <= 0) {
                                  finalPrice = Number(basePrice) || 0;
                                }

                                return (
                                  <div key={idx} className="text-xs">
                                    <div className="flex justify-between items-center pr-2">
                                      <div className="flex items-center gap-1 flex-1">
                                        <span className="text-white font-bold flex items-center flex-wrap gap-x-2">
                                          {player.name}
                                          {(() => {
                                            const cleanName = String(player?.name || "").replace(/\(T\)$/i,'').trim();
                                            const lowerName = cleanName.toLowerCase();
                                            const meta = playerMetadataMap[lowerName];
                                            const isForeign = meta ? meta.isForeign : (
                                                            player.isForeign || 
                                                            String(player.role || "").toLowerCase().includes("overseas") ||
                                                            (player.nationality && player.nationality !== "India")
                                                          );
                                            return isForeign ? (
                                              <span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full bg-blue-600 text-[10px] font-black text-white shadow-md leading-none shrink-0">✈</span>
                                            ) : null;
                                          })()}
                                        </span>
                                      </div>
                                      <p className="price-font text-amber-300 font-bold text-sm ml-2 whitespace-nowrap">₹{formatAmount(finalPrice)}</p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-slate-500 italic py-1">No players in squad yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ScrollWrapper>
              </div>
            )}
            {activeTab === "settings" && (
              <ScrollWrapper className="flex-1 min-h-0">
                <SettingsPanel
                  timerSeconds={auction.timerConfigSeconds}
                  onTimerChange={() => {}}
                  isAdmin={session?.role === "admin"}
                  roomId={roomId}
                  socket={socket}
                  users={users}
                  isAccelerated={auction.accelerated}
                />
              </ScrollWrapper>
            )}
          </div>
        </div>

        {/* Right: Player Pool */}
        <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
          <div className="rounded-2xl border border-line bg-panel p-4 flex-1 flex flex-col">
            <PlayerPoolPanel bootstrapSets={bootstrapSets} auctionType={effectiveAuctionType} />
          </div>
        </div>
      </div>
      </ScrollWrapper>

      {auctionResult && (
        <div className={`fixed inset-0 backdrop-blur-sm flex items-start justify-center z-50 transition-all duration-200 overflow-y-auto py-12 ${isDismissingAuctionResult ? "bg-black/0 opacity-0" : "bg-black/50 opacity-100"}`}>
          <div className={`relative rounded-2xl border border-emerald-500/40 bg-emerald-950/90 p-8 max-w-4xl w-full mx-4 transition-all duration-200 ${isDismissingAuctionResult ? "translate-y-2 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"} h-auto min-h-fit mb-12`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Auction Completed</h2>
                <p className="mt-1 text-slate-300">{auctionResult.message}</p>
                {isAuctionResultRatingsLoading && (
                  <p className="mt-1 text-xs text-emerald-200/80">Computing team auto-scores...</p>
                )}
                {auctionResultRatingsError && (
                  <p className="mt-1 text-xs text-amber-300">{auctionResultRatingsError}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-3 min-w-[140px]">
                <button
                  type="button"
                  className="rounded-xl bg-slate-800/80 px-6 py-2.5 text-base font-bold text-white hover:bg-slate-700 border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-lg"
                  onClick={dismissAuctionResultToHome}
                  disabled={isDismissingAuctionResult}
                >
                  {isDismissingAuctionResult ? "Closing..." : "Dismiss"}
                </button>
                
                <div className="flex flex-row gap-3 justify-end w-full px-1">
                  <button
                    onClick={() => {
                      const target = selectedResultTeam || (auctionResultTeams[0]?.teamId);
                      if (target) downloadSquad(target, "result");
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent border border-white/10 hover:bg-white/5 hover:border-cyan-500/50 transition-all text-slate-300 hover:text-cyan-400 group"
                    title="Download Selected Squad"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-active:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const target = selectedResultTeam || (auctionResultTeams[0]?.teamId);
                      if (target) shareSquadAction(target, "result");
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent border border-white/10 hover:bg-white/5 hover:border-emerald-500/50 transition-all text-slate-300 hover:text-emerald-400 group"
                    title="Share Selected Squad"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-active:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 flex-1 mb-6">
              {auctionResultTeams.map(({ teamId, team }) => {
                const purseLeft = Number(team?.purseRemaining ?? team?.purse ?? 0);
                const playerCount = Number(team?.totalPlayers ?? (Array.isArray(team?.players) ? team.players.length : 0));
                const teamPlayers = Array.isArray(team?.players) ? team.players : [];
                const isExpanded = Boolean(auctionResultExpandedTeams[teamId]);
                const isSelected = selectedResultTeam === teamId;

                return (
                  <div 
                    key={teamId} 
                    className={`rounded-xl border transition-all p-3 ${
                      isSelected 
                        ? "border-slate-600 bg-slate-900/60 shadow-sm" 
                        : "border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAuctionResultTeamExpanded(teamId)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-1.5 text-lg font-bold text-slate-200">
                        <TeamLogoBadge teamId={teamId} size="sm" />
                        {teamId}
                        {hostTeamId === teamId && (
                          <span className="text-amber-300" title="Host">👑</span>
                        )}
                        <div className="relative h-4 min-w-[60px]">
                          <span className={`absolute left-0 top-0 whitespace-nowrap text-[10px] text-slate-400 font-black tracking-tight transition-opacity duration-200 ${isSelected ? "opacity-100" : "opacity-0"}`}>
                            {teamId === session?.team ? "(YOU)" : "(SELECTED)"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg transition-transform duration-200 ${isExpanded ? "rotate-90 text-cyan-400" : "text-slate-500"}`}>▶</span>
                      </div>
                    </button>
                    
                    <div className="flex items-center justify-between text-slate-300 text-sm mt-1 px-1">
                      <div>Players: {playerCount} • Purse: <span className="price-font font-bold text-white">₹{formatAmount(purseLeft)}</span></div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">Score: {team.autoScore?.overall?.toFixed(1) || "0.0"}</span>
                        <AnimatedScoreStars score={team.autoScore?.overall || 0} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div id={`result-squad-${teamId}`} className="mt-2 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-3">
                        <div className="mb-2 rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-2">
                          <div className="flex items-center justify-between text-xs text-emerald-200 mb-1">
                            <span className="font-bold">Team Potential</span>
                            <AnimatedScoreStars score={team.autoScore?.overall || 0} />
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-300">
                            <div className="flex items-center gap-1">
                              <span className="opacity-60 uppercase">Batting:</span>
                              <AnimatedScoreStars score={team.autoScore?.batting || 0} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="opacity-60 uppercase">Bowling:</span>
                              <AnimatedScoreStars score={team.autoScore?.bowling || 0} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-2">
                           <TeamLogoBadge teamId={teamId} size="xs" />
                           <div>
                              <h3 className="font-bold text-white leading-none">
                                {teamId}
                                {hostTeamId === teamId && <span className="ml-1 text-amber-300" title="Host">👑</span>}
                              </h3>
                              <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em] mt-1 squad-label-font font-extrabold antialiased opacity-80">Final Auction Squad · {playerCount} Players</p>
                           </div>
                        </div>
                        
                         {teamPlayers.length > 0 ? (
                          <div className="space-y-1.5 mt-2">
                            {teamPlayers.map((player, index) => {
                              const finalPrice = getBoughtPriceNumber(player);
                              return (
                                <div key={`${teamId}-player-${index}`} className="flex items-center justify-between text-[13px] text-slate-200 py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded transition-colors group">
                                  <span className="truncate pr-2 flex items-center gap-2">
                                    <span className="text-slate-500 font-mono w-5 shrink-0">{index + 1}.</span>
                                    <span className="font-bold group-hover:text-cyan-300 transition-colors uppercase tracking-tight">{player?.name || "Unknown"}</span>
                                    {(() => {
                                       const cleanName = String(player?.name || "").replace(/\(T\)$/i,'').trim();
                                       const lowerName = cleanName.toLowerCase();
                                       const meta = playerMetadataMap[lowerName];
                                       const isForeign = meta ? meta.isForeign : (
                                                       player.isForeign || 
                                                       String(player.role || "").toLowerCase().includes("overseas") ||
                                                       (player.nationality && player.nationality !== "Indian")
                                                     );
                                       return isForeign ? (
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-blue-600 text-[11px] font-black text-white shadow-md leading-none shrink-0" title="Overseas">✈</span>
                                       ) : null;
                                    })()}
                                  </span>
                                  <span className="price-font whitespace-nowrap font-black text-amber-400 text-sm">₹{formatAmount(finalPrice > 0 ? finalPrice : 0)}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400">No players bought.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feedback Section */}
            <div className="mt-3 rounded-xl border border-white/5 bg-white/5 p-4 relative overflow-hidden">
               {feedbackSubmitted ? (
                  <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-400">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-3">
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Submitted</span>
                    </div>
                    <div className="flex items-center justify-center text-emerald-400 font-black gap-3 mb-6 uppercase tracking-tighter text-2xl">
                       <div className="bg-emerald-500/20 p-2 rounded-full border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                       </div>
                       Thank You!
                    </div>
                    
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden">
                      <div className="flex flex-wrap items-center gap-6 relative z-10">
                        <div className="flex flex-col items-center sm:items-start shrink-0 sm:border-r border-white/5 sm:pr-6 w-full sm:w-auto">
                           <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Your Rating</span>
                           <div className="flex gap-1">
                             {[1, 2, 3, 4, 5].map((s) => (
                               <span key={s} className={`text-sm ${s <= userRating ? "text-amber-400" : "text-slate-800"}`}>★</span>
                             ))}
                           </div>
                        </div>
                        
                        <div className="flex-1 min-w-[200px]">
                           <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">Your Review</span>
                           <p className="text-xs text-slate-300 italic leading-relaxed">
                             {userComment ? `"${userComment}"` : "No comment provided."}
                           </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] uppercase tracking-widest font-bold">
                        <span className="text-slate-600">Arena Community Feedback</span>
                        <span className="text-emerald-500/70">Verified Submission</span>
                      </div>
                    </div>
                  </div>
               ) : (
                 <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex flex-col items-center sm:items-start shrink-0">
                       <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2">Rate your Arena Experience</span>
                       <FeedbackStars rating={userRating} setRating={setUserRating} disabled={isFeedbackSubmitting} />
                    </div>
                    <div className="flex-1 w-full flex flex-col gap-3">
                       <div className="relative">
                        <textarea 
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                          placeholder="How was the auction? Any suggestions?"
                          className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all resize-none h-[64px]"
                          disabled={isFeedbackSubmitting}
                        />
                       </div>
                    </div>
                    <button
                      onClick={submitFeedback}
                      disabled={userRating === 0 || isFeedbackSubmitting}
                      className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
                        userRating === 0 || isFeedbackSubmitting
                          ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/20 shadow-xl"
                      }`}
                    >
                      {isFeedbackSubmitting ? "Sending..." : "Submit Feedback"}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      <WarningPopup
        message={warningMessage}
        onClose={() => setWarningMessage(null)}
      />

      {showEndAuctionConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl bg-slate-900 border border-rose-500/40 p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">End Auction?</h2>
            <p className="text-slate-300 mb-6">Are you sure you want to end this Auction?</p>
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setShowEndAuctionConfirm(false)}
                className="px-6 py-2 rounded-lg border border-slate-500 text-slate-300 hover:bg-slate-800 transition-colors font-semibold"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAuctionEnding(true);
                  setShowEndAuctionConfirm(false);
                  socket.emit("endAuction", { roomId });
                }}
                className="px-6 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Off-screen Capture Zone - Ensures Download/Share works perfectly every time */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 select-none">
        {Object.entries(displayTeamState).map(([teamId, team]) => (
          <TeamSnapshotCard 
            key={`snap-${teamId}`} 
            teamId={teamId} 
            team={team} 
            purse={displayTeamPurse(team)} 
            users={users}
            metadataMap={playerMetadataMap}
          />
        ))}
        {/* Result Snapshot mapping also to handle modal case */}
        {auctionResultTeams.map(({ teamId, team }) => (
          <TeamSnapshotCard 
            key={`snap-res-${teamId}`} 
            teamId={teamId} 
            team={team} 
            purse={Number(team?.purseRemaining ?? team?.purse ?? 0)} 
            users={users}
            metadataMap={playerMetadataMap}
          />
        ))}
      </div>
    </main>
  );
}

export default AuctionPage;
