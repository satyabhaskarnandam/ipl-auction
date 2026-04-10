/**
 * All 10 current IPL franchises — crest/wordmark assets + brand tile gradients.
 * Static files live under /public/teams (served as /teams/...).
 * Remote URLs are fallbacks if a file is missing after deploy.
 */
const local = (file) => [`/teams/${file}`];

/** Tailwind classes: team-colour “card” backgrounds (readable under transparent SVGs). */
const tile = {
  CSK: "bg-gradient-to-br from-yellow-500/95 via-amber-700/80 to-blue-950",
  MI: "bg-gradient-to-br from-blue-950 via-blue-800 to-sky-950",
  RCB: "bg-gradient-to-br from-red-700 via-red-900 to-black",
  KKR: "bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-950",
  SRH: "bg-gradient-to-br from-orange-500 via-orange-700 to-orange-950",
  DC: "bg-gradient-to-br from-sky-500 via-blue-800 to-slate-950",
  PBKS: "bg-gradient-to-br from-red-800 via-rose-900 to-red-950",
  RR: "bg-gradient-to-br from-blue-950 via-indigo-900 to-fuchsia-800/90",
  GT: "bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950",
  LSG: "bg-gradient-to-br from-teal-700 via-cyan-900 to-blue-950",
};

export const IPL_TEAMS = [
  {
    id: "CSK",
    short: "CSK",
    tileBg: tile.CSK,
    accent: "ring-yellow-300/70",
    logoUrls: [
      ...local("csk.svg"),
      "https://upload.wikimedia.org/wikipedia/en/2/2b/Chennai_Super_Kings_Logo.svg",
    ],
  },
  {
    id: "MI",
    short: "MI",
    tileBg: tile.MI,
    accent: "ring-sky-300/70",
    logoUrls: [
      ...local("mi.svg"),
      "https://upload.wikimedia.org/wikipedia/en/c/cd/Mumbai_Indians_Logo.svg",
    ],
  },
  {
    id: "RCB",
    short: "RCB",
    tileBg: tile.RCB,
    accent: "ring-amber-400/70",
    logoUrls: [
      ...local("rcb.svg"),
      "https://upload.wikimedia.org/wikipedia/en/d/d4/Royal_Challengers_Bengaluru_Logo.svg",
    ],
  },
  {
    id: "KKR",
    short: "KKR",
    tileBg: tile.KKR,
    accent: "ring-amber-300/70",
    logoUrls: [
      ...local("kkr.svg"),
      "https://upload.wikimedia.org/wikipedia/en/4/4c/Kolkata_Knight_Riders_Logo.svg",
    ],
  },
  {
    id: "SRH",
    short: "SRH",
    tileBg: tile.SRH,
    accent: "ring-orange-200/70",
    logoUrls: [
      ...local("srh.svg"),
      "https://upload.wikimedia.org/wikipedia/en/5/51/Sunrisers_Hyderabad_Logo.svg",
      "https://upload.wikimedia.org/wikipedia/commons/6/60/Sunrisers_Hyderabad.jpg",
    ],
  },
  {
    id: "DC",
    short: "DC",
    tileBg: tile.DC,
    accent: "ring-sky-200/70",
    logoUrls: [
      ...local("dc.svg"),
      ...local("dc.png"),
      "https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals.svg",
      "https://upload.wikimedia.org/wikipedia/commons/c/c5/Delhi_Capitals_Logo.png",
    ],
  },
  {
    id: "PBKS",
    short: "PBKS",
    tileBg: tile.PBKS,
    accent: "ring-rose-200/70",
    logoUrls: [
      ...local("pbks.svg"),
      "https://upload.wikimedia.org/wikipedia/en/d/d4/Punjab_Kings_Logo.svg",
    ],
  },
  {
    id: "RR",
    short: "RR",
    tileBg: tile.RR,
    accent: "ring-pink-300/70",
    logoUrls: [
      ...local("rr.svg"),
      "https://upload.wikimedia.org/wikipedia/en/5/5c/This_is_the_logo_for_Rajasthan_Royals%2C_a_cricket_team_playing_in_the_Indian_Premier_League_%28IPL%29.svg",
    ],
  },
  {
    id: "GT",
    short: "GT",
    tileBg: tile.GT,
    accent: "ring-indigo-300/70",
    logoUrls: [
      ...local("gt.svg"),
      "https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg",
    ],
  },
  {
    id: "LSG",
    short: "LSG",
    tileBg: tile.LSG,
    accent: "ring-cyan-200/70",
    logoUrls: [
      ...local("lsg.svg"),
      "https://upload.wikimedia.org/wikipedia/en/3/34/Lucknow_Super_Giants_Logo.svg",
      ...local("lsg.png"),
      "https://upload.wikimedia.org/wikipedia/commons/6/69/Lucknow_logo.v1.png",
    ],
  },
];
