const fs = require('fs');

try {
  const raw = fs.readFileSync('../data/players.json', 'utf8').replace(/^\uFEFF/, '').trim();
  const arr = JSON.parse(raw);
  const seen = new Set();
  const deduped = [];
  
  for (const player of arr) {
    if (!player || !player.name) continue;
    const key = player.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(player);
    }
  }
  
  fs.writeFileSync('../data/players.json', JSON.stringify(deduped, null, 2), 'utf8');
  console.log(`Deduplicated players.json: Went from ${arr.length} down to ${deduped.length} unique players.`);
} catch (e) {
  console.error(e.message);
}
