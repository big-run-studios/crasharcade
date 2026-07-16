# CrashArcade → Unity: portfolio architecture review

Purpose: pressure-test the v0 conversion-pipeline plan (scoped around Spy Runner) against
the *whole* portfolio, since we're converting many games, not one. Verdict: the plan's
**spirit is right** (per-game Unity project, platform seam + stub, spec-first, review
checkpoints, ScriptableObject tuning) but **three baked-in assumptions would corner us**:
"2D URP + sprite atlases," "crash-curve RNG math," and "automated codegen from the hosted
minified build." Fixes below.

## The portfolio at a glance (12 games)

| Game | Renderer | Core mechanic | Input | RNG → determinism | Biggest port risk |
|---|---|---|---|---|---|
| spy-runner | **3D** Three.js persp + bloom | lane crash-runner | tap/lane | wave RNG, moderate | 3D + deformable road ribbon |
| go-chicken-go | **3D** Three.js **ortho** + bloom | Crossy-Road hopper | tap/swipe | lane-gen RNG, moderate | full 3D scene + bloom |
| drone-siege | 2D canvas (procedural) | Galaga fixed-shooter | strafe/drag | dive/fire RNG, moderate | formation/dive AI, waves, bosses, lives |
| strike-force | 2D canvas (**no assets**) | twin-stick run-and-gun | 360° drag-aim | combat RNG everywhere, **hard** | bullet-hell + boss FSM, HP buffer |
| unicorn-horde | 2D canvas (procedural) | bullet-heaven survivor | drag-to-aim | swarm RNG, **hard** | hundreds of entities, swarm director |
| underground-circuit | 2D canvas (procedural) | Punch-Out boxer | swipe-combat | boss-AI RNG, hard | ms-precise dodge/counter boss FSM |
| bend-ball-strike | 2D canvas (**fake-3D** projection) | draw-a-curve soccer | **draw-path** | shot-scatter RNG (23), moderate | freehand bezier input + projection math |
| final-approach | 2D canvas (procedural) | air-traffic control | **draw-path** | spawn RNG (16), moderate | route-geometry pipeline (resample/smooth/snap) |
| ski-hero | 2D canvas + sprite sheets | downhill trick physics | hold/release + swipe | **cosmetic-only, trivial** | continuous slope physics + rotation |
| spy-dash | 2D canvas + sprite sheets | on-rails infiltration | swipe-timing | gameplay RNG, has seeded pattern | ~9 cinematic "mode" sub-FSM + external art pipeline |
| beat-rush | 2D canvas | 5-lane rhythm | multi-touch slide/hold | **cosmetic-only** | **sample-accurate Web Audio + chart editor** |
| mahjong-master | **2D DOM/CSS** (no canvas) | NMJL hand-builder | tile drag/tap | 1 shuffle, **easy** | **72-hand rule DSL + combinatorial matcher/solver** |

Hub (`index.html`): just an anchor-link menu, directory-per-game, **no shared runtime, no
shared assets** (each game copies the CSS palette and bundles its own `music.mp3`).

## What's actually universal (the real reusable core)

Every game shares one thing — the **CrashArcade meta-shell**, and *only* this:

- Lifecycle: `menu → play → cashed | dead` (no game has a "betting" state — the wager is
  implicit/platform-level).
- **Hold-to-cash-out** to bank score-at-risk (600–900ms across games); **crash/fail = zero
  banked**.
- Best-score persistence, mute toggle, back-to-arcade, synth SFX + one looped MP3.
- Rich **tuning tables** as plain JS objects (maps cleanly to ScriptableObjects).

Everything below the shell — renderer, input, the "run" state, the scoring source — is
**bespoke per game**. There is no shared gameplay primitive.

## The three corners the v0 plan would paint us into

**Corner 1 — "2D URP + sprite atlases" baked into the template.**
Reality: 2 games are genuinely 3D (spy-runner perspective, go-chicken-go orthographic —
both need bloom); 1 is DOM/CSS (mahjong — a UI-Toolkit/UGUI port, not a renderer game);
and most of the 2D games **draw procedurally with no sprite atlases at all** (strike-force
has zero image assets). A sprite-atlas import stage applies to only ~3 games.
→ **Fix:** the reusable framework must be **render-agnostic**. Rendering is a per-game
module: 3D URP + post-processing volume for the Three.js games, 2D URP for procedural-canvas
games, UGUI/UI Toolkit for mahjong. Don't hardwire 2D into the template.

**Corner 2 — "crash-curve RNG math" as a shared primitive.**
Reality: **no game has an Aviator-style RNG multiplier curve.** The "crash" is always a
*skill failure* (hit traffic, miss a note, drop a combo, lose a fight, wipe out, midair
collision, run out the clock) and the multiplier/score is *earned*, not drawn from a curve.
A Stage-2 extractor looking for "crash-curve math" finds nothing in 12/12 games.
→ **Fix:** delete "crash-curve math" from the spec schema. Replace with "score/multiplier
source" (skill-earned) and "fail condition." The banked-vs-lost meta is the shared part;
the curve is a phantom.

**Corner 3 — universal "bit-identical seeded replay parity" gate + automated codegen.**
Reality: determinism cost varies wildly. Trivial/irrelevant for beat-rush (audio clock),
ski-hero, mahjong; moderate for the lane/spawn games; **expensive** for strike-force /
unicorn-horde / underground-circuit (RNG threaded through combat + variable-dt loops that
would need a fixed-step refactor to be bit-reproducible). Meanwhile auto-transpiling
minified JS → idiomatic C# is unrealistic for a DOM rules-engine (mahjong) or an
audio-scheduled rhythm game — and pointless when we own clean single-file source.
→ **Fix (a):** make parity **tiered, decided per game at spec time** — deterministic
seeded replay where it's cheap; behavioral + feel parity where it isn't. Not a universal
blocking gate. → **Fix (b):** spec-first is gold, but **port from clean source, don't
transpile the hosted build.** Automate the mechanical parts (tuning tables → SOs, enums,
constants); hand-port gameplay guided by the spec.

## Two game-specific landmines to plan around now

- **beat-rush** is the true outlier: it needs an **audio-clock game loop**
  (`AudioSettings.dspTime`), multi-stem streaming, latency calibration, and a **chart
  format + editor**. A frame-based crash-loop template cannot carry it. Either the template
  gains an audio-timing backbone, or beat-rush is explicitly a **second template**.
- **mahjong-master** needs a faithful reimplementation of the **72-hand rule DSL +
  `expandAll`/`variantDist` matcher** (a data compiler + constraint solver) and a draggable
  tile rack — it's the Arena guide's "complex rules → interactive tutorial" case, and it's
  UI, not a renderer game. Budget it as a bespoke port, not a template stamp.

## The architecture that avoids all three corners

Layer the template so the shared part is genuinely shared and the bespoke part is isolated:

```
Framework/           (template-owned, hand-authored, versioned, render/genre-agnostic)
  MetaShell/         menu→play→cashed|dead FSM, hold-to-cash-out, score-at-risk banking,
                     crash=zero, best/mute, results screens
  Platform/          the Skillz seam — IMatchLifecycle, IScoreSubmitter, IReplayRecorder,
                     IPlatformConfig + no-op LocalPlatform (swap in SkillzPlatform later)
  Input/             gesture/pointer abstraction (concrete handlers live in Game/)
  Tuning/            ScriptableObject base + loader
Game/<slug>/         per-game: the "run" gameplay, its renderer module (2D/3D/UI),
                     its input handlers, its generated tuning SOs
```

- **Per-game Unity project** stays (matches Arena — the platform is the loader/hub, so we
  do **not** port the CrashArcade hub; a tiny local scene-picker is dev-only).
- The **shared unit is the Framework template**, not any gameplay. Each game imports it and
  fills `Game/<slug>/`.
- Renderer, input, run-loop, and score source are per-game plug-ins — no 2D/crash-curve
  assumption leaks into the shared layer.

## Net changes to the Buren feedback

The existing `spy-runner/PIPELINE_FEEDBACK.md` (3D not 2D; ingest clean source not hosted
build; freeze scoring; seedable-RNG prerequisite) still stands for the pilot. Add, at the
program level: (1) the framework must be render- and genre-agnostic — scope
`Framework/CrashLoop` down to the meta-shell; (2) drop "crash-curve math" from the spec
schema; (3) parity is tiered per game, not one universal bit-identical gate; (4) beat-rush
and mahjong need their own plans (audio backbone / rules-engine port) before they enter the
pipeline.
