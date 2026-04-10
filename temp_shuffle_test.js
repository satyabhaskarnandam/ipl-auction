const { loadAuctionSets } = require('./server/controllers/playerDatasetController');
for (let i = 0; i < 5; i += 1) {
  const sets = loadAuctionSets({ relaxed: true });
  console.log('run', i, 'first marquee:', sets.sets[0].players.slice(0, 5).map((p) => p.name).join(', '));
}
