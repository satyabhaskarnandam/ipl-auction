const PLAYER_RATINGS = {
  "Virat Kohli": 9.5,
  "Rohit Sharma": 9.3,
  "Suryakumar Yadav": 9.1,
  "Jasprit Bumrah": 9.2,
  Bumrah: 9.2,
  "MS Dhoni": 8.8,
  "Rishabh Pant": 8.9,
  "KL Rahul": 8.8,
  "Hardik Pandya": 8.8,
  "Ravindra Jadeja": 8.8,
  "Rashid Khan": 9.0,
  "Jos Buttler": 9.0,
  "Pat Cummins": 8.8,
  "Mohammad Siraj": 8.3,
  "Yuzvendra Chahal": 8.6,
  "Andre Russell": 8.7,
};

const ROLE_DEFAULT_RATING = {
  batsman: 6.5,
  bowler: 6.5,
  allRounder: 7.0,
  wicketkeeper: 6.8,
};

const BATTING_WEIGHTS = {
  batsman: 1,
  wicketkeeper: 0.8,
  allRounder: 0.6,
};

const BOWLING_WEIGHTS = {
  bowler: 1,
  allRounder: 0.6,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundToOne = (value) => Math.round(value * 10) / 10;

const normalizeRoleKey = (role) => {
  const source = String(role || "").trim().toLowerCase();
  if (!source) return "batsman";

  if (source.includes("all-round") || source.includes("all round") || source.includes("allround")) {
    return "allRounder";
  }
  if (source.includes("wicket") || source.includes("keeper") || source === "wk") {
    return "wicketkeeper";
  }
  if (
    source.includes("bowler") ||
    source.includes("spinner") ||
    source.includes("spin") ||
    source.includes("pacer") ||
    source.includes("fast") ||
    source.includes("seam")
  ) {
    return "bowler";
  }

  return "batsman";
};

const getBoughtPrice = (player) => {
  const soldPrice = Number(player?.soldPrice);
  if (Number.isFinite(soldPrice) && soldPrice > 0) return soldPrice;

  const price = Number(player?.price);
  if (Number.isFinite(price) && price > 0) return price;

  return 0;
};

const getPlayerRating = (player, roleKey) => {
  const explicitRating = Number(player?.rating);
  if (Number.isFinite(explicitRating) && explicitRating > 0) {
    return explicitRating;
  }

  const playerName = String(player?.name || "").trim();
  if (playerName && Object.prototype.hasOwnProperty.call(PLAYER_RATINGS, playerName)) {
    return PLAYER_RATINGS[playerName];
  }

  return ROLE_DEFAULT_RATING[roleKey] || ROLE_DEFAULT_RATING.batsman;
};

const getDepthBonus = (optionsCount) => {
  if (optionsCount >= 5) return 0.5;
  if (optionsCount >= 3) return 0.3;
  return 0;
};

const getBattingSizeFactor = (totalPlayers) => {
  if (totalPlayers >= 11) return 1;
  if (totalPlayers <= 0) return 0;
  return totalPlayers / 11;
};

const getBowlingDepthMultiplier = (effectiveBowlers) => {
  if (effectiveBowlers < 2) return 0.5;
  if (effectiveBowlers < 4) return 0.7;
  return 1;
};

const getBowlingDepthBonus = (effectiveBowlers) => {
  if (effectiveBowlers >= 5) return 0.5;
  if (effectiveBowlers >= 3) return 0.3;
  return 0;
};

const MAX_BONUS = 0.2;

const getBalanceBonus = ({ battingOptions, effectiveBowlers }) => {
  if (battingOptions >= 5 && effectiveBowlers >= 4) return 0.3;
  if (battingOptions < 3 || effectiveBowlers < 2) return -0.3;
  return 0;
};

const weightedAverageToFive = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return 0;

  const totalWeight = entries.reduce((sum, entry) => sum + Number(entry.weight || 0), 0);
  if (totalWeight <= 0) return 0;

  const weightedRatingSum = entries.reduce(
    (sum, entry) => sum + Number(entry.rating || 0) * Number(entry.weight || 0),
    0
  );

  const avgOnTenScale = weightedRatingSum / totalWeight;
  return avgOnTenScale / 2;
};

const buildInsights = ({ batting, bowling, battingOptions, effectiveBowlers, totalPlayers, balanceBonus }) => {
  const insights = [];

  if (batting > bowling + 0.4) insights.push("Strong batting lineup");
  if (bowling > batting + 0.4) insights.push("Strong bowling attack");
  if (bowling <= 2.4) insights.push("Weak bowling attack");
  if (effectiveBowlers < 4) insights.push("Needs more bowlers");
  if (balanceBonus > 0 && batting >= 3.4 && bowling >= 3.2) insights.push("Well-balanced squad");
  if (batting <= 2.2 && bowling <= 2.2) insights.push("Weak squad, needs improvement");
  if (totalPlayers < 11) insights.push("Incomplete squad");

  if (insights.length === 0) {
    if (batting >= 3.3 && bowling >= 3.1) insights.push("Well-balanced squad");
    else insights.push("Squad needs more balance and quality depth");
  }

  return Array.from(new Set(insights));
};

const rateTeamSquad = (team) => {
  const players = Array.isArray(team?.players) ? team.players : [];
  const boughtPlayers = players.filter((player) => getBoughtPrice(player) > 0);

  if (boughtPlayers.length === 0) {
    return {
      teamName: String(team?.name || "Unknown"),
      batting: 0,
      bowling: 0,
      overall: 0,
      insights: [],
      roleBreakdown: {
        batsmen: 0,
        bowlers: 0,
        allRounders: 0,
        wicketkeepers: 0,
        battingOptions: 0,
        bowlingOptions: 0,
      },
    };
  }

  const roleBreakdown = {
    batsmen: 0,
    bowlers: 0,
    allRounders: 0,
    wicketkeepers: 0,
    battingOptions: 0,
    bowlingOptions: 0,
  };

  const battingEntries = [];
  const bowlingEntries = [];

  boughtPlayers.forEach((player) => {
    const roleKey = normalizeRoleKey(player?.role);
    const rating = getPlayerRating(player, roleKey);

    if (roleKey === "batsman") roleBreakdown.batsmen += 1;
    if (roleKey === "bowler") roleBreakdown.bowlers += 1;
    if (roleKey === "allRounder") roleBreakdown.allRounders += 1;
    if (roleKey === "wicketkeeper") roleBreakdown.wicketkeepers += 1;

    if (BATTING_WEIGHTS[roleKey]) {
      battingEntries.push({ rating, weight: BATTING_WEIGHTS[roleKey] });
      roleBreakdown.battingOptions += 1;
    }

    if (BOWLING_WEIGHTS[roleKey]) {
      bowlingEntries.push({ rating, weight: BOWLING_WEIGHTS[roleKey] });
      roleBreakdown.bowlingOptions += 1;
    }
  });

  const battingBase = weightedAverageToFive(battingEntries);
  const bowlingBase = weightedAverageToFive(bowlingEntries);

  const teamSize = boughtPlayers.length;
  const effectiveBowlers = roleBreakdown.bowlers + roleBreakdown.allRounders * 0.5;

  const battingWithDepth = battingBase + getDepthBonus(roleBreakdown.battingOptions);
  const battingWithSizePenalty = battingWithDepth * getBattingSizeFactor(teamSize);
  const battingScore = clamp(battingWithSizePenalty, 0, 5);

  const bowlingWithDepth = bowlingBase + getBowlingDepthBonus(effectiveBowlers);
  const bowlingWithPenalty = bowlingWithDepth * getBowlingDepthMultiplier(effectiveBowlers);
  const bowlingScore = clamp(bowlingWithPenalty, 0, 5);

  const balanceBonus = getBalanceBonus({
    battingOptions: roleBreakdown.battingOptions,
    effectiveBowlers,
  });

  // Prevent score inflation
  const battingCapped = Math.min(battingScore, 5);
  const bowlingCapped = Math.min(bowlingScore, 5);
  const bonusCapped = Math.min(balanceBonus, MAX_BONUS);

  // Overall calculation with clamping
  const averagedScore = (battingCapped + bowlingCapped) / 2;
  const withBalance = clamp(averagedScore + bonusCapped, 0, 5);
  const completenessPenalty = teamSize < 11 ? (11 - teamSize) * 0.15 : 0;
  const overallScore = clamp(withBalance - completenessPenalty, 0, 5);

  const batting = roundToOne(battingScore);
  const bowling = roundToOne(bowlingScore);
  const overall = roundToOne(overallScore);

  return {
    teamName: String(team?.name || "Unknown"),
    batting,
    bowling,
    overall,
    insights: buildInsights({
      batting,
      bowling,
      battingOptions: roleBreakdown.battingOptions,
      effectiveBowlers,
      totalPlayers: teamSize,
      balanceBonus,
    }),
    roleBreakdown,
  };
};

const rateMultipleTeams = (teams) => {
  const list = Array.isArray(teams) ? teams : [];
  return list.map((team) => rateTeamSquad(team));
};

module.exports = {
  rateTeamSquad,
  rateMultipleTeams,
};
