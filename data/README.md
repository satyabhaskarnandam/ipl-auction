# Player dataset (`players.json`)

- **~350 real players** (name, country, role, category) with **IPL-style base prices** in ₹ Cr: `0.2, 0.3, 0.5, 0.75, 1, 1.25, 1.5, 2` only (extra rows merged from `scripts/extra-player-rows.txt` when present).
- **Sets** (server order): Marquee → Batsmen → Bowlers → All-rounders → Wicketkeepers → Uncapped.

## Regenerate / edit the pool

Source of truth is the curated lists in:

```text
scripts/assemble-real-players.cjs
```

Run:

```bash
node scripts/assemble-real-players.cjs
```

That overwrites `data/players.json`. Edit the tab-separated blocks in the script and/or `scripts/extra-player-rows.txt` to add/remove players (strict validation expects **200–400** total unique names; current build targets **300+**).

**Do not** use random name-mash generators — the repo previously used one and produced incorrect “Frankenstein” players.

## “Dataset must have 200–250 players (got 3)”

The **API and auction** read `data/players.json` from the **machine running the Node server**. If you still see “got 3”, the server is using an old file or a different project folder — restart the server after regenerating.
