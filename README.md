# makefun-gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Jaw1jennaira/makefun-gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Jaw1jennaira/makefun-gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Vice City Neon — the best offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI: every trophy with its official name, description and grade, a guide in our own words that cites its sources, a checklist saved in the browser with export and import, filters by kind and grade, a spoiler shield that hides story trophies until earned, a ~200-hour roadmap to the platinum, the one potentially missable trophy explained, a 100% ledger, and a disputes page where the guides disagree. Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

## Run it

```sh
python3 -m http.server --directory app 8000
# open http://localhost:8000/
```

Or build the served output the way the grader does:

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What's inside

- `app/` — the guide as static files: `index.html`, `css/app.css`, `js/app.js`, `data/trophies.json` (all 55 trophies with guides), `data/sources.json`
- `screenshots/` — real renders of the guide running in a desktop browser
- `main.ts` — Node 22 program: copies `app/` (and `screenshots/`) to `/output`

---

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
