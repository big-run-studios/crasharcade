# Spy Runner → Unity / Arena Migration Plan

Turning the Three.js prototype (`index.html`) into a Unity project deliverable for the
Skillz **Arena** platform, per *Arena Game Integration Guide for External Game Studios*.

## Decisions (locked 2026-07-01)

- **Delivery format:** Option 1 — **full Unity project**. Arena builds for iOS/Android/WebGL
  in their shell. No WebGL comm-layer work; cleanest update path.
- **Fairness:** **seedable RNG from day one.** All randomness (traffic waves, `scoreToBeat`)
  routes through one seeded generator so a shared `randomSeed` yields identical runs for both
  players. Arena's roadmap adds `randomSeed` to the LoadGame payload — build for it now.
- **v1 scope:** **core loop only first** (PLAY / CRASH / CASHED + scoring). Defer the intro
  cop cutscene and skin picker until the loop is solid in Unity.

## Key framing

- "Option 2 – WebGL Build" in the guide means a **Unity** WebGL export
  (`index.html` + `Build/` + `TemplateData/`), *not* the current hand-written Three.js page.
  Either path is a real Unity rebuild. We chose Option 1.
- Platform owns the loader, host communication, user management, payment, and lifecycle.
  We implement exactly **one `IArcadeGame`** and use the injected **`IGameBridge`**.
- **No Addressables / asset bundles** — the game is small; bundle all assets into the build.

## Arena contract → Spy Runner hooks

| Arena contract | Spy Runner mapping |
|---|---|
| `IArcadeGame.Init(gameId, gameSpecificDetails, bridge)` | New `SpyRunnerGame` entry point; replaces `init()` + `MENU`. Parse `gameSpecificDetails` for difficulty / target / seed. |
| `bridge.NotifyGameReady()` | When scene is built & playable (end of init, before/at INTRO). |
| `bridge.NotifyGameFinished(payload)` | In `crash()` and `cashOut()` — send `{score, banked, target, win}`. |
| `bridge.Exit(gameId)` | Back button (`onBack`/`exitArcade`) — replaces `location.href='../index.html'`. |
| Platform owns loader/user/payment | Delete MENU screen, arcade-exit link, and `localStorage` best-score. |
| Addressables | Not used — bundle everything. |

## Phases

### Phase 0 — Inputs from the Arena team (blockers)
- Supported Unity version + the **Arena Unity package** (real `IArcadeGame` / `IGameBridge`
  definitions, adapter base, sample).
- Exact `NotifyGameFinished` payload schema (score fields, win/loss, JSON shape).
- Does `scoreToBeat` / `seed` arrive via `gameSpecificDetails` at MVP, or post-MVP?
- Confirmed **portrait** orientation + safe-area spec (HUD/tabs/nav render on top of our view).
- Registered `gameId` (e.g. `spy-runner`).

### Phase 1 — Integration skeleton first
- New Unity **URP** project, portrait.
- Define `IArcadeGame` / `IGameBridge` per the guide + a **`MockGameBridge`** and a fake
  "LoadGame" launcher (our own stand-in for Arena's future Test SDK).
- Grey-box `SpyRunnerGame` that only calls `NotifyGameReady` → `NotifyGameFinished` on a timer.
- **Prove the full lifecycle before any gameplay** — de-risks the genuinely new part.

### Phase 2 — Core gameplay (v1 scope)
- State machine: PLAY / CRASH / CASHED (no MENU).
- Lane steering + chase cam; 4 scoring lanes + green cash-out shoulder.
- Scoring: per-lane multipliers `[4,2,1.5,1]`, left-lane speed bonus, heat/combo,
  near-miss, hold-to-cash-out (10×), `scoreToBeat`.
- Traffic waves + debris + crash.
- **Seedable RNG** behind one interface; seed comes from `gameSpecificDetails` when available.

### Phase 3 — World & look
- Scrolling road ribbon, procedural hills/bends, roadside signage, neon backdrop, cars/people.
- Emissive materials + URP **Bloom** volume to match the neon aesthetic.
- Skins as ScriptableObjects (deferred per v1 scope, but structured now).

### Phase 4 — UI & audio
- HUD: score pill, lane legend, heat bar, cash ring; crash/cashed cards.
- Music + wreck sfx (reuse existing mp3s); mute.
- Honor the non-negotiable safe-area.

### Phase 5 — Ship
- Swap `MockGameBridge` for the real Arena package; run Arena's Test SDK when available.
- Produce the **package-dependency list** (URP, Input System, TextMeshPro, etc.).
- **Media assets:** 16:9 + 9:16 tiles (1920×1080 / 1080×1920), 5–10s gameplay `.avif`,
  tutorial `.avif` steps, logotype (holds at 24pt), 1080×780 background.
  Can start now in parallel — the art already exists.

## Explicitly NOT porting
- The `MENU` screen and skin-picker UI (v1), the exit-to-sibling-arcade link,
  and `localStorage` best-score (platform owns match results).
