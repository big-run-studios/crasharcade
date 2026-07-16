# Feedback on CrashArcade → Unity Pipeline (v0) — guidance for the converter

Reviewed against the actual Spy Runner source. The overall shape is right — Unity 6
LTS, URP, platform seam with a local stub, spec-first with review checkpoints, seeded
parity. Keep all of that. Four corrections below change how the pipeline should run for
this pilot. The first two are blocking; treat them as authoritative over the v0 doc.

## 1. BLOCKING — Spy Runner is 3D, not 2D. Retarget the template to 3D URP.

The v0 doc scopes the target as "2D URP" with sprite atlases, SpriteRenderer/UGUI, and
pixel-perfect filtering. Spy Runner has no sprites. It is a 3D perspective game. Confirmed
in source:

- `THREE.PerspectiveCamera(60, W/H, 1, 2400)` — perspective, not orthographic.
- `THREE.WebGLRenderer` with `THREE.EffectComposer` + `THREE.UnrealBloomPass`
  (strength 0.6, radius 0.55, threshold 0.74) — bloom post-processing is core to the look.
- Geometry is procedural meshes (`THREE.BoxGeometry` cars/debris/coins), plus a
  **deformable road-ribbon `BufferGeometry`** whose vertices bend per-frame for hills
  and lateral sway. Lanes are baked in as **vertex colors** on an unlit
  `MeshBasicMaterial`.

Correct target for this game: **3D URP** — perspective camera, MeshRenderer/MeshFilter,
a URP **Bloom** override in a Volume, and a runtime-deformed mesh for the road. The
analyzer's "sprite atlas layout" stage does not apply; replace it with mesh/material/
camera/post-processing extraction. Keep a 2D path in the template if you want, but do not
run the pilot through it.

## 2. BLOCKING — Convert from source, not the hosted minified build. And use the current version.

The v0 doc ingests `index.html` from the live github.io site and de-obfuscates the
minified bundle. Don't, for this pilot. The authoritative source is a single, readable,
commented file in the repo:

- **Source of truth:** `spy-runner/index.html` (one file, ~1030 lines, unminified,
  heavily commented). Point ingest at this. No de-obfuscation or AST-recovery needed —
  the analyzer works on clean source, which the v0 doc itself notes is far cheaper.
- **Version mismatch:** the v0 doc lists "the newer neon Spy Runner prototype (separate
  video)" as out of scope and targets the hosted build. That is inverted — the neon
  version *is* the current product and *is* this repo (convertible intro cutscene, curved
  OutRun road, heat/near-miss scoring). The hosted github.io build is an older, pre-neon
  cut. Converting it would ship the wrong game. Target the repo source at its current
  version.

Net: ingest reads a local (or repo) file path, not a URL, and skips the de-obfuscator.

## 3. Freeze scoring before parity. Scoring is in active flux right now.

The parity gate ("identical to web") only holds against a frozen web build. The scoring
model is being actively reworked (lane × heat accrual, near-miss bonus, cash-out ×10,
score-to-beat). Do **not** start Stage 2 spec extraction of the scoring system until we
tag a frozen build. We'll signal the freeze commit. Everything non-scoring (state machine,
rendering, input, traffic spawner, curve) can proceed before then. Agreed on deferring the
Skillz tie-avoidance rule to v1.1 behind a flag.

## 4. Seeded-RNG parity has a prerequisite — the web build is not deterministic yet.

The doc's headline parity test is a bit-identical seeded crash/traffic curve. Today the
source calls `Math.random()` directly in ~9 places — traffic wave composition and gap
lane (`spawnWave`), curve segment rolls (`Curve`), `scoreToBeat`, cop spawn chance, and
debris/coin visuals. There is no seed. So the prerequisite chain is:

1. In the web build, replace `Math.random()` with a single **seedable PRNG** (e.g.
   Mulberry32/xorshift128) routed through one `rand()` gateway. Separate the
   gameplay-affecting stream (waves, gap lane, scoreToBeat, cop chance) from
   cosmetic-only randomness (debris/coin scatter) so cosmetic RNG never perturbs the
   deterministic gameplay stream.
2. Port **that exact PRNG algorithm** to C# (same integer math, same seed → same
   sequence). Do not use `System.Random` or `UnityEngine.Random` — their sequences won't
   match JS.
3. Then the deterministic replay test (same seed + same inputs → same score) is meaningful.

Big Run owns step 1 in the web build; the converter must consume the seed contract, not
invent its own. We'll expose the PRNG + gateway so codegen can mirror it.

## Adopt as-is

- The `Framework/Platform/` seam (`IMatchLifecycle`, `IScoreSubmitter`, `IReplayRecorder`,
  `IPlatformConfig` + no-op `LocalPlatform`) — good, keep it; it's the seam we swap the
  real Skillz SDK into. Note the Skillz sample bridge is expected in ~1–2 weeks; design
  the interfaces so that swap is the only change.
- Tuning constants → ScriptableObjects, spec-first with a review checkpoint before codegen,
  and the two human checkpoints + parity sign-off.

## One scope question

The v0 doc's end state is a general automated JS→C# converter skill across all CrashArcade
games. For a single 3D pilot from clean source, a **spec-driven hand-port** is likely
faster and higher-fidelity than auto-codegen of arbitrary 3D gameplay. Proposal: keep the
JSON spec + review checkpoints (they're valuable either way), but treat full automated
codegen as earned later once there are multiple games — don't gate the Spy Runner v1 on it.
Open to your view.

## Green light

Stage 1 (ingest + first look) is approved **with the source pointed at
`spy-runner/index.html`, not the hosted build**, and the understanding that the target is
3D URP. Hold scoring spec extraction until the freeze tag.
