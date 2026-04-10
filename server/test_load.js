const { loadAuctionSetsForStart, loadAuctionSets } = require('./controllers/playerDatasetController');
console.log("Testing strict mode...");
try {
  loadAuctionSets({ relaxed: false });
} catch (e) {
  console.error(e.message);
}
console.log("Testing relaxed mode...");
try {
  const result = loadAuctionSets({ relaxed: true });
  console.log(`Loaded ${result.totalPlayers} players in relaxed mode.`);
} catch (e) {
  console.error("error:", e.stack || e.message);
}
