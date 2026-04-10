import React, { useMemo } from "react";
import { formatAmount } from "../lib/formatAmount";
import { IPL_TEAMS } from "../data/teams";

const TEAM_DETAILS = {
  RCB: { slogan: "Play Bold", gradient: "from-red-900 via-red-950 to-black" },
  GT: { slogan: "Aava De", gradient: "from-blue-900 via-slate-900 to-slate-950" },
  CSK: { slogan: "Whistle Podu", gradient: "from-yellow-600 via-yellow-700 to-amber-900" },
  KKR: { slogan: "Korbo Lorbo Jeetbo", gradient: "from-purple-900 via-purple-950 to-indigo-950" },
  MI: { slogan: "One Family", gradient: "from-blue-700 via-blue-900 to-slate-900" },
  RR: { slogan: "Halla Bol", gradient: "from-pink-700 via-pink-900 to-blue-950" },
  SRH: { slogan: "Orange Army", gradient: "from-orange-600 via-orange-900 to-black" },
  DC: { slogan: "Roar Macha", gradient: "from-blue-800 via-blue-950 to-slate-900" },
  PBKS: { slogan: "Sadda Punjab", gradient: "from-red-700 via-red-900 to-slate-900" },
  LSG: { slogan: "Ab Apni Baari Hai", gradient: "from-teal-700 via-teal-900 to-slate-900" },
  UNSOLD: { slogan: "PASSED", gradient: "from-slate-800 via-slate-900 to-black" },
};

const PHRASES_LOW = [
  "{PLAYER} → {TEAM} is confirmed",
  "The hammer goes down! {PLAYER} heads to {TEAM}",
  "{PLAYER} joins {TEAM} to bolster their lineup",
  "{PLAYER} officially becomes part of {TEAM}",
  "Excellent value for money as {TEAM} sign {PLAYER}",
  "{PLAYER} is absolutely a steal for {TEAM}",
  "A superb acquisition for {TEAM} grabbing {PLAYER} at this price",
  "{PLAYER} brings essential balance to {TEAM}",
  "A crucial puzzle piece found as {TEAM} land {PLAYER}",
  "Another key signing for {TEAM} with {PLAYER}",
  "All smiles at the {TEAM} table after quietly securing {PLAYER}",
  "An essential reinforcement for {TEAM} adding {PLAYER}",
  "{PLAYER}'s signature is safely secured by {TEAM}",
  "A wonderful tactical pickup by {TEAM} for {PLAYER}",
  "A highly clinical bidding strategy by {TEAM} for {PLAYER}",
  "The auctioneer confirms! {PLAYER} sold to {TEAM}",
  "A massive boost to the squad depth of {TEAM} with {PLAYER}",
  "A highly rated draft addition as {TEAM} snap up {PLAYER}",
  "Smart business by {TEAM} to secure {PLAYER}",
  "A very calculated masterstroke by {TEAM} to add {PLAYER}",
  "Strategic depth added as {TEAM} bring in {PLAYER}",
  "{PLAYER} is the latest arrival at the {TEAM} camp",
  "A low-risk, high-reward move by {TEAM} for {PLAYER}",
  "The {TEAM} dugout looks pleased with the signing of {PLAYER}",
  "Efficient resource management as {TEAM} land {PLAYER}",
  "{PLAYER} will be looking to make a mark for {TEAM}",
  "A solid foundation built by {TEAM} adding {PLAYER}",
  "No-nonsense bidding from {TEAM} seals {PLAYER}",
  "{PLAYER} is now officially a part of the {TEAM} journey",
  "A bargain hunter's delight for {TEAM} as they sign {PLAYER}",
  "{PLAYER} slots perfectly into the {TEAM} roster",
  "Confidence high at the {TEAM} base after securing {PLAYER}",
  "A very tidy piece of business by {TEAM} for {PLAYER}",
  "The {TEAM} management stays focused and lands {PLAYER}",
  "Consistency is key, and {TEAM} get it with {PLAYER}",
  "A calculated acquisition by {TEAM} for {PLAYER}",
  "{PLAYER} brings a wealth of potential to {TEAM}",
  "The {TEAM} squad depth grows stronger with {PLAYER}",
  "A precise and effective bid from {TEAM} for {PLAYER}",
  "Welcome to {TEAM}, {PLAYER}",
  "{PLAYER} is ready to don the {TEAM} colors",
  "A steal at this price? {TEAM} certainly think so for {PLAYER}",
  "Steady progress in the room as {TEAM} secure {PLAYER}",
  "A tactical win for {TEAM} in the chase for {PLAYER}",
  "{PLAYER} joins {TEAM} following a smooth bid",
  "Balance and grit: {TEAM} find it with {PLAYER}",
  "The scouting team's pick: {PLAYER} to {TEAM}",
  "A professional signing by {TEAM} for {PLAYER}",
  "The {TEAM} table is all business as they land {PLAYER}",
  "Focus on the future: {TEAM} sign {PLAYER}",
  "A solid roster choice by {TEAM} with {PLAYER}",
  "{PLAYER} is now a key part of the {TEAM} vision",
  "Clean, simple, and effective: {TEAM} take {PLAYER}",
  "The {TEAM} roster expands with the addition of {PLAYER}",
  "A very smart tactical move by {TEAM} for {PLAYER}",
  "Building for success, {TEAM} bring in {PLAYER}",
  "{PLAYER} is a great utility player for {TEAM}",
  "Patience pays off for {TEAM} as they secure {PLAYER}",
  "Solid work by {TEAM} to land {PLAYER} today",
  "{PLAYER} adds another dimension to {TEAM}",
  "A well-timed bid from {TEAM} for {PLAYER}",
  "Quality at a budget: {TEAM} get {PLAYER}",
  "The {TEAM} backroom staff smiles as {PLAYER} is sold",
  "Reliable and ready: {PLAYER} joins {TEAM}",
  "{PLAYER} joins the ranks of {TEAM}",
  "The {TEAM} family gets a new member in {PLAYER}",
  "A disciplined bid from {TEAM} seals the deal for {PLAYER}",
  "{PLAYER} is a shrewd addition to the {TEAM} camp",
  "Building momentum: {TEAM} add {PLAYER}",
  "{PLAYER} to {TEAM}. The deal is done",
  "The draft picks up steam as {TEAM} sign {PLAYER}",
  "A focused pursuit ends with {TEAM} getting {PLAYER}",
  "Simple execution by {TEAM} to land {PLAYER}",
  "{PLAYER} is a perfect squad player for {TEAM}",
  "The {TEAM} depth chart looks better with {PLAYER}",
  "A great day for {PLAYER} as they join {TEAM}",
  "Methodical work by {TEAM} to secure {PLAYER}",
  "The first of many? {TEAM} land {PLAYER}",
  "A quiet but vital signing by {TEAM} for {PLAYER}"
];

const PHRASES_MID = [
  "A massive addition to the squad as {TEAM} secure {PLAYER}",
  "Fantastic business by {TEAM} to snap up {PLAYER}",
  "Huge cheers in the room as {TEAM} sign {PLAYER}",
  "The paddle stays raised longest by {TEAM} for {PLAYER}",
  "A brilliant strategic move by {TEAM} signing {PLAYER}",
  "{TEAM} finally win the intense race for {PLAYER}",
  "The room erupts as {TEAM} sign {PLAYER}",
  "Expect massive impact from {PLAYER} for {TEAM}",
  "{PLAYER} joins {TEAM} in a high-profile signing",
  "Incredible scenes! {PLAYER} is sold to {TEAM}",
  "The management is thrilled as {TEAM} sign {PLAYER}",
  "A commanding bid from {TEAM} completely seals {PLAYER}",
  "{TEAM} win the right to sign {PLAYER}",
  "This could be the game-changing signing for {TEAM} getting {PLAYER}",
  "{TEAM} show serious intent by signing {PLAYER}",
  "The tension breaks! {TEAM} successfully claim {PLAYER}",
  "Absolutely massive implications as {TEAM} sign {PLAYER}",
  "That is class quality added to {TEAM} in {PLAYER}",
  "The bidding stops here! {TEAM} take away {PLAYER}",
  "{TEAM} make a decisive late move to secure {PLAYER}",
  "An elite acquisition by {TEAM} finalizing {PLAYER}",
  "The hammer drops! {PLAYER} is officially a {TEAM} player",
  "Top-tier addition to the roster as {TEAM} land {PLAYER}",
  "The bidding room is buzzing after {TEAM} take {PLAYER}",
  "Serious firepower added to the {TEAM} arsenal with {PLAYER}",
  "A very deliberate and successful pursuit of {PLAYER} by {TEAM}",
  "{TEAM} have their man! {PLAYER} joins the squad",
  "Momentum shifts towards {TEAM} as they finalize {PLAYER}",
  "A high-stakes battle ends with {TEAM} landing {PLAYER}",
  "{PLAYER} is set to be a cornerstone for {TEAM}",
  "The {TEAM} owners are ecstatic after signing {PLAYER}",
  "Pure tactical genius as {TEAM} outlast others for {PLAYER}",
  "{PLAYER}'s arrival marks a new chapter for {TEAM}",
  "Dynamic and dangerous: {TEAM} secure {PLAYER}",
  "The perfect fit? {TEAM} certainly think so with {PLAYER}",
  "A major statement of intent as {TEAM} wrap up {PLAYER}",
  "{PLAYER} is a game-winner, and now he belongs to {TEAM}",
  "The room goes quiet as {TEAM} drop a hammer bid for {PLAYER}",
  "A high-quality addition that changes the dynamic of {TEAM}",
  "{TEAM} have outwitted the competition to land {PLAYER}",
  "The {TEAM} fans will be delighted with the signing of {PLAYER}",
  "A versatile and talented asset in {PLAYER} heads to {TEAM}",
  "{PLAYER} is ready to lead the charge for {TEAM}",
  "A significant upgrade for {TEAM} in the form of {PLAYER}",
  "The {TEAM} roster looks formidable with {PLAYER}",
  "An aggressive play from {TEAM} that pays off with {PLAYER}",
  "{PLAYER}'s pedigree is exactly what {TEAM} needed",
  "A high-impact move by {TEAM} for the talented {PLAYER}",
  "The bidding war was worth it: {TEAM} have {PLAYER}",
  "A marquee-level signing: {PLAYER} to {TEAM}",
  "Energy levels rise at the {TEAM} table as they sign {PLAYER}",
  "A very focused and successful bid by {TEAM} for {PLAYER}",
  "{PLAYER} is a massive boost for the {TEAM}",
  "The strategy for {TEAM} is coming together with {PLAYER}",
  "Boldness rewarded as {TEAM} finalize {PLAYER}",
  "A top-shelf addition to the {TEAM} attack for {PLAYER}",
  "{PLAYER} will be the one to watch at {TEAM}",
  "The value of {PLAYER} is clear as {TEAM} sign him up",
  "A tactical masterclass by {TEAM} to secure {PLAYER}",
  "{TEAM} find their x-factor in {PLAYER}",
  "Every cent was worth it: {TEAM} get {PLAYER}",
  "Strength in depth: {TEAM} reinforce with {PLAYER}",
  "The talk of the town: {PLAYER}'s move to {TEAM}",
  "A highly anticipated signing culminates in {PLAYER} to {TEAM}",
  "A superb addition to the leadership group at {TEAM} with {PLAYER}",
  "{PLAYER} adds the spark that {TEAM} were looking for",
  "The most talked-about move so far: {PLAYER} joins {TEAM}",
  "Precision and power: {TEAM} secure {PLAYER}",
  "The ultimate team player? {TEAM} think they've found him in {PLAYER}",
  "A high-value asset in {PLAYER} is heading to the {TEAM} dugout",
  "The room agrees: {PLAYER} is a perfect match for {TEAM}",
  "The hammer falling for {PLAYER} to {TEAM} is a landmark moment",
  "A very focused bidding session ends with {TEAM} taking {PLAYER}",
  "{PLAYER} brings a winning mentality to the {TEAM} group",
  "A top-shelf recruitment by {TEAM} finalizing {PLAYER}",
  "The auction moves forward as {PLAYER} joins {TEAM}",
  "A very impressive tactical acquisition: {PLAYER} to {TEAM}",
  "Ready for action: {PLAYER} is a {TEAM} player now",
  "A superb addition to the spine of the {TEAM} squad with {PLAYER}",
  "The {TEAM} camp looks significantly stronger with {PLAYER}",
  "{PLAYER}'s journey continues with the iconic {TEAM}",
  "A major piece of the {TEAM} jigsaw falls into place: {PLAYER}"
];

const PHRASES_HIGH = [
  "The bidding war ends with {TEAM} picking up {PLAYER}",
  "Big money spent, but {TEAM} successfully land {PLAYER}",
  "{PLAYER} is heading to {TEAM} after a fierce bidding battle",
  "What a monumental signing for {TEAM} acquiring {PLAYER}",
  "{TEAM} makes a massive statement acquiring {PLAYER}",
  "A marquee addition for {TEAM} signing {PLAYER}",
  "One of the absolute buys of the day! {TEAM} get {PLAYER}",
  "{PLAYER} heads to {TEAM} in a highly anticipated mega move",
  "Blockbuster signing for {TEAM} landing {PLAYER}",
  "{PLAYER} brings massive firepower to the {TEAM} camp",
  "Premium talent heading to {TEAM} as they sign {PLAYER}",
  "An absolute bidding frenzy ends with {TEAM} taking {PLAYER}",
  "Record books checking as {TEAM} smash the bid for {PLAYER}",
  "{TEAM} flex their financial muscle to sign {PLAYER}",
  "A jaw-dropping bid from {TEAM} successfully lands {PLAYER}",
  "The undisputed headline-maker of the hour: {PLAYER} to {TEAM}",
  "A king-sized acquisition as {TEAM} secure {PLAYER} at all costs",
  "Total dominance in the bidding room by {TEAM} for {PLAYER}",
  "{PLAYER} is now the crown jewel of the {TEAM} squad",
  "An earth-shattering bid from {TEAM} completely silences the room",
  "The highest levels of intent shown by {TEAM} for {PLAYER}",
  "Absolute madness in the hall as {TEAM} claim {PLAYER}",
  "{PLAYER} to {TEAM}: the signing everyone was waiting for",
  "History made! {TEAM} break the bank to land {PLAYER}",
  "A tactical masterpiece and a financial heavy-hit for {PLAYER} by {TEAM}",
  "The ultimate bidding showdown ends in favor of {TEAM} for {PLAYER}",
  "No holding back: {TEAM} secure the most wanted {PLAYER}",
  "Legendary status incoming as {PLAYER} joins {TEAM}",
  "The most expensive seal of the session: {PLAYER} is a {TEAM} player",
  "The marquee man is finally sold! {TEAM} take {PLAYER} home",
  "A game-changing mega-deal: {PLAYER} joins {TEAM} in a whirlwind",
  "The {TEAM} management stands tall after winning the battle for {PLAYER}",
  "Exhilaration at the {TEAM} table: They've secured {PLAYER}",
  "A bidding masterclass culminates in {PLAYER} heading to {TEAM}",
  "{PLAYER} is officially the big-ticket arrival at {TEAM}",
  "This is the heart of the auction: {TEAM} claim {PLAYER} after a saga",
  "A high-octave bidding battle concludes: {PLAYER} is a {TEAM} player",
  "{TEAM} have redefined the draft by landing {PLAYER}",
  "The bidding hits the roof! {TEAM} outmuscle everyone for {PLAYER}",
  "Pure, unadulterated intent: {TEAM} sign the massive {PLAYER}",
  "The most ferocious bidding of the day ends with {TEAM} taking {PLAYER}",
  "A record-breaking feel as {TEAM} finalize the signing of {PLAYER}",
  "{PLAYER} is the anchor that {TEAM} were desperate to land",
  "Total conviction from {TEAM} to ignore the price and land {PLAYER}",
  "A superstar signing for a superstar team: {PLAYER} to {TEAM}",
  "The room is still shaking! {TEAM} have finalized {PLAYER}",
  "Absolute blockbuster! {PLAYER} is the new face of {TEAM}",
  "No compromises made: {TEAM} secure the elite {PLAYER}",
  "The pinnacle of the auction: {PLAYER} is heading to {TEAM}",
  "A deal that will be talked about for years: {PLAYER} joins {TEAM}",
  "The auctioneer's favorite moment: {PLAYER} sold to {TEAM}",
  "Big players, big money, big outcome: {TEAM} get {PLAYER}",
  "{PLAYER} will be the highest impact signing for {TEAM}",
  "The wait was worth it: {TEAM} have their superstar in {PLAYER}",
  "An earth-moving bid that completely ends the chase: {PLAYER} to {TEAM}",
  "{TEAM} show the world why they wanted {PLAYER} so badly",
  "The perfect synergy: {PLAYER} joins the {TEAM} powerhouse",
  "A high-fidelity signing for {TEAM} bringing in {PLAYER}",
  "Top of the wishlist: {TEAM} have finally checked off {PLAYER}",
  "An absolute riot of bids ends with {TEAM} standing victorious for {PLAYER}",
  "{PLAYER} to {TEAM}. The headline we all expected but still wowed us",
  "Financial might meets tactical precision: {TEAM} get {PLAYER}",
  "The ultimate prize is claimed! {TEAM} take {PLAYER}",
  "A historic bid for a historic player: {PLAYER} is a {TEAM} asset",
  "The {TEAM} camp will celebrate long into the night for {PLAYER}",
  "A seismic shift in power as {TEAM} land the phenomenal {PLAYER}",
  "The absolute highlight of the day: {PLAYER} sold to {TEAM}",
  "{TEAM} have rewritten the rules today by signing {PLAYER}",
  "A legendary acquisition: {PLAYER}",
  "Big players for big moments: {TEAM} secure {PLAYER}",
  "The most dominant display of bidding power: {TEAM} take {PLAYER}",
  "{PLAYER} to {TEAM} - a deal that transcends the room",
  "A true heavyweight signing: {TEAM} have their man in {PLAYER}",
  "The auctioneer's gavel has never sounded better: {PLAYER} to {TEAM}",
  "A masterpiece of an acquisition by {TEAM} for {PLAYER}",
  "Highest honors to {TEAM} for landing the world-class {PLAYER}",
  "A career-defining move for {PLAYER} as he joins the {TEAM} giants",
  "Total and absolute commitment shown by {TEAM} for {PLAYER}",
  "The room stands to applaud: {PLAYER} is officially a {TEAM} player"
];

const PHRASES_UNSOLD = [
  "No bidders for {PLAYER} at this stage. He remains unsold",
  "The gavel falls, but the paddles stay down. {PLAYER} is passed",
  "Silence in the room as {PLAYER} goes through without a bid",
  "{PLAYER} heads back to the pavilion. He will have to wait",
  "No interest from any of the ten tables for {PLAYER}",
  "A surprise pass? {PLAYER} remains in the pool for now",
  "The bidding didn't even start for {PLAYER}. Unsold",
  "Franchises are playing it very safe. {PLAYER} finds no buyers",
  "Tactical decision from the teams? {PLAYER} goes unsold",
  "{PLAYER} is passed by the auctioneer. No interest shown today",
  "No paddles raised for {PLAYER} at his base price",
  "The room is quiet as {PLAYER}'s name is called. Passed",
  "{PLAYER} remains in the unsold pool",
  "A missed opportunity? {PLAYER} goes unsold in this round",
  "No one willing to take the risk on {PLAYER} right now",
  "The auction moves on. {PLAYER} is left behind for now",
  "No bid for {PLAYER}. He will look for a chance in the accelerated round",
  "Patience is key, but today, no one wanted {PLAYER}",
  "{PLAYER} is officially unsold as the room stays quiet",
  "The hammer drops on an empty bid. {PLAYER} is passed",
  "No bidders for {PLAYER} as we close this turn",
  "{PLAYER} will have to wait for the next set of call-ups",
  "A very quiet room for {PLAYER}. No paddles in the air",
  "{PLAYER} remains available as a free agent for now",
  "No bidders for the talented {PLAYER}. Unexpected",
  "Franchises looking elsewhere? {PLAYER} goes unsold",
  "The auctioneer's wait ends in a pass for {PLAYER}",
  "A tactical withdrawal of interest for {PLAYER}",
  "{PLAYER} survives the round but without a contract",
  "No bid found for {PLAYER} in this round",
  "The room stays icy for {PLAYER}. No bid found",
  "{PLAYER} is set aside as we continue the auction",
  "No bid for {PLAYER}. He remains in the pavilion",
  "Franchises holding their purse? {PLAYER} is passed",
  "{PLAYER} is the latest name to go unsold",
  "The room remains silent as {PLAYER} is called",
  "A pass from the room for {PLAYER}",
  "{PLAYER} is now officially in the unsold list",
  "No paddles for {PLAYER} at ₹{PRICE}",
  "The gavel falls on an empty table for {PLAYER}",
  "No one ready to commit to {PLAYER} just yet",
  "{PLAYER} returns to the pool with no bidders",
  "A quiet exit for {PLAYER} in this round",
  "The franchises are keeping their cards close. {PLAYER} unsold",
  "No interest shown in {PLAYER} during this turn",
  "{PLAYER} heads for a break as no taker is found",
  "The auction moves forward without {PLAYER}",
  "No bid for {PLAYER} from any of the franchise owners",
  "{PLAYER} is passed over by the room",
  "The silence speaks volumes as {PLAYER} goes unsold",
  "The franchises pass on {PLAYER}. He remains up for grabs later",
  "The room is unmoved by {PLAYER}'s name",
  "No current bids found for {PLAYER}. He's unsold",
  "A quick pass for {PLAYER} from the auctioneer",
  "{PLAYER} remains in the pool as the franchises look on",
  "No response from the tables for {PLAYER}",
  "The search for a team continues for {PLAYER}",
  "No one raising the paddle for {PLAYER} today",
  "{PLAYER} is passed as teams focus on their targets",
  "A strategic pass for {PLAYER} from the room",
  "{PLAYER} goes through with no one bidding",
  "The gavel confirms it: {PLAYER} is unsold",
  "No one ready to pull the trigger for {PLAYER}",
  "{PLAYER} will be hoping for a second chance",
  "The room stays dark for {PLAYER}. No bid",
  "{PLAYER} is left in the pavilion as the auction proceeds",
  "No interest from the big hitters for {PLAYER}",
  "A surprise unsold: {PLAYER} remains in the pool",
  "No bid for {PLAYER}. The franchises are waiting",
  "{PLAYER} is passed by every table in the room",
  "The auctioneer's call for {PLAYER} goes unanswered",
  "No interest for {PLAYER}. He heads back to the list",
  "The room remains still as {PLAYER} is auctioned",
  "A pass for {PLAYER}. No interest today",
  "{PLAYER} is unsold as teams look for different roles",
  "No paddles for {PLAYER}. He remains available",
  "The auction floor stays quiet for {PLAYER}"
];

const globalAssignedPhrases = new Map();
const globalUsedHistory = [];

function getDeterministicIndex(seedStr, max) {
  if (!seedStr || max <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (Math.imul(31, hash) + seedStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

function getPhrase(pool, seedStr, id) {
  if (globalAssignedPhrases.has(id)) {
    return globalAssignedPhrases.get(id);
  }

  let baseHash = getDeterministicIndex(seedStr, pool.length);
  let chosen = null;
  
  for (let i = 0; i < pool.length; i++) {
     let index = (baseHash + i) % pool.length;
     let phrase = pool[index];
     
     let recentlyUsed = false;
     let historyLen = globalUsedHistory.length;
     let lookback = Math.min(15, historyLen);
     
     for (let j = 0; j < lookback; j++) {
        if (globalUsedHistory[historyLen - 1 - j] === phrase) {
            recentlyUsed = true;
            break;
        }
     }
     
     if (!recentlyUsed) {
         chosen = phrase;
         break;
     }
  }
  
  if (!chosen) {
      chosen = pool[baseHash];
  }
  
  globalAssignedPhrases.set(id, chosen);
  globalUsedHistory.push(chosen);
  
  if (globalUsedHistory.length > 50) {
      globalUsedHistory.shift();
  }
  
  return chosen;
}

export default function AuctionCommentaryBlock({ player, team, soldPrice, teamName, status = "SOLD", id, roomId }) {
  const isUnsold = status === "UNSOLD";
  
  const teamData = isUnsold ? TEAM_DETAILS.UNSOLD : (TEAM_DETAILS[team] || {
    slogan: "Player Sold",
    gradient: "from-emerald-700 to-emerald-950",
  });

  const phraseTemplate = useMemo(() => {
    if (isUnsold) {
      const pool = PHRASES_UNSOLD;
      const seedStr = (player || "") + (id || "") + (roomId || "UNSOLD");
      const chosenRaw = getPhrase(pool, seedStr, (id || player) + (roomId || "UNSOLD"));
      const priceStr = formatAmount(soldPrice || 0.5);
      return chosenRaw.replace(/{PLAYER}/g, player).replace(/{PRICE}/g, priceStr);
    }

    const priceNum = Number(soldPrice) || 0;
    let pool = PHRASES_LOW;
    if (priceNum > 8.0) pool = PHRASES_HIGH;
    else if (priceNum > 2.0) pool = PHRASES_MID;

    const seedStr = (player || "") + (id || "") + (roomId || "");
    const chosenRaw = getPhrase(pool, seedStr, (id || player) + (roomId || ""));
    const finalTeam = teamName || team;
    return chosenRaw.replace(/{PLAYER}/g, player).replace(/{TEAM}/g, finalTeam);
  }, [player, team, teamName, soldPrice, id, roomId, isUnsold]);

  return (
    <div className={`relative overflow-hidden bg-no-repeat rounded-xl bg-gradient-to-r ${teamData.gradient} p-3 border-none outline-none ring-0`}>
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      <div className="relative flex flex-col w-full z-20">
        <div className="flex items-center gap-2 mb-2">
          {isUnsold ? (
            <span className="text-xs font-black text-slate-400">🔨</span>
          ) : (() => {
               const teamObj = IPL_TEAMS.find(t => t.id === team);
               const logoUrl = teamObj?.logoUrls?.[0];
               return logoUrl ? (
                 <img 
                   src={logoUrl} 
                   alt={team} 
                   className="h-5 w-5 object-contain" 
                   style={{ imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }} 
                 />
               ) : (
                 <span className="text-xs font-black text-amber-500">⚡</span>
               );
          })()}
          <span className="font-black text-white text-xs tracking-widest uppercase">{teamData.slogan}</span>
        </div>
        
        <div className="h-px w-full bg-white/30 mb-2.5"></div>
        
        <p className="text-sm font-semibold text-white leading-snug">
          {phraseTemplate}{!isUnsold && ` for ₹${formatAmount(soldPrice)}`}.
        </p>
      </div>
    </div>
  );
}
