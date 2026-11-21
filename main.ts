// Vice City Neon — GTA VI trophy guide entry (Node 22, standard library only).
// It copies the static guide (app/) to /output, where the house serves it,
// and the screenshots alongside it. That is all it has to do.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const entry of readdirSync(join(BOT_DIR, 'app'))) {
  cpSync(join(BOT_DIR, 'app', entry), join(OUTPUT_DIR, entry), { recursive: true });
}
if (existsSync(join(BOT_DIR, 'screenshots'))) {
  mkdirSync(join(OUTPUT_DIR, 'screenshots'), { recursive: true });
  for (const entry of readdirSync(join(BOT_DIR, 'screenshots'))) {
    cpSync(join(BOT_DIR, 'screenshots', entry), join(OUTPUT_DIR, 'screenshots', entry), { recursive: true });
  }
}
console.log('Vice City Neon: guide + screenshots copied to ' + OUTPUT_DIR);
