const fs = require('fs');

let raw = fs.readFileSync('../data/players.json', 'utf8');
let lines = raw.split('\n');

// The garbage chunk appears to be from line 101 (index 100) to line 161 (index 160).
// Line 100 is: "    {"name": "Arjun Tendulkar", "basePrice": 1.0, "set": "Fast Bowlers", "role": "Fast Bowler", "country": "India"}"
// Line 163 is: "  {"
// Let's replace the block with just a comma to string them together.

lines.splice(100, 62, "    {\"name\": \"Arjun Tendulkar\", \"basePrice\": 1.0, \"set\": \"Fast Bowlers\", \"role\": \"Fast Bowler\", \"country\": \"India\"},");

let newRaw = lines.join('\n');

try {
    JSON.parse(newRaw);
    console.log("SUCCESS! Writing to players.json...");
    fs.writeFileSync('../data/players.json', newRaw, 'utf8');
} catch (e) {
    console.error("FAILED to parse after splice:", e.message);
}
