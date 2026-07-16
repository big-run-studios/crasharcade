# CrashArcade

Portfolio of self-contained HTML5 "crash" arcade games (build a provisional score, cash out before you lose it). Each game is one folder with a single `index.html`; the hub menu is the root `index.html`.

## Working conventions (Andrew's standing rules)
- **Commit directly to `main`** — no feature branches. Bump the in-file version string (`.brand` div) with every change and write descriptive commit messages. Push when asked ("push it") or after being told to push routinely.
- **Preview**: start the dev server with the `arcade` config in `.claude/launch.json` (never `python -m http.server` via Bash). **Mute game audio before driving the preview** (`localStorage` mute keys, e.g. `uni_mute=1`) — Andrew hears the audio but can't see the pane.
- **Verify once per change** — run the headless harness a single time; don't loop tests chasing flake. Don't screenshot-verify animation/motion; Andrew reviews juice himself. Static states are fine to screenshot.
- **Full-bleed viewport**: every game fills any portrait window (no letterboxing). 2D games use the visible-logical-rect pattern; see memory notes.
- **Juice rule: never flash the whole screen.** Use character-anchored effects (ground beam rings, callouts under the player, vignettes).
- Balance values always live in a single `CFG` literal per game.

## Active project: Unicorn Horde (`unicorn-horde/`)
3D horde-battler crash game — the three.js build **is** the game at `unicorn-horde/index.html` (three.js r160 vendored in `lib/`). `classic-2d.html` is a frozen archive: never mirror changes into it. Detailed design rules live in the agent memory file `unicorn-horde.md` (controls, extraction, multiplier, weapons, chest/spawn rules, art decisions, gotchas).

### Headless test harness
Every game exposes `window.__game` in the console:
- `s` (state snapshot), `step(dt)` (advances sim + camera), `startRun/toMenu`, `tp(x,y)`, `goto(x,y)`, `stickSet(dx,dy)`, `spawnAt(type,x,y)`, `clear()`, `invuln()`, `lvl()`, `give(w)`, `pickW/pickS`, `setT(t)`, `gateNow`, `crashNow/cashNow`, `clearBombNow`, `padPos()`, `ents()`, `bench()`.
- **Trap:** `spawnAt` enforces a 400-unit spawn-safety radius — an enemy spawned "next to" the player gets pushed out of weapon range. To test combat at close range, spawn first and `tp` the player to the enemy (or use `slice`, which is exempt).
- The browser pane's RAF keeps running between tool calls — timed effects decay in real time; pose scenes immediately before screenshots, or pulse the effect on an interval.

## Other games
go-chicken-go, spy-runner, drone-siege, underground-circuit, spy-dash, bend-ball-strike, strike-force, final-approach, mahjong-master, beat-rush, ski-hero — all shipped prototypes, occasionally revisited. Hub tiles in root `index.html`.
