# Spy Dash — Environment Asset Spec (v0.8.2)

Everything below is currently drawn procedurally in canvas. Dimensions are **logical game px**
(the game canvas is 480×720 logical; the character renders ~106 logical px tall for scale).
**Recommended export: 4× logical dimensions**, PNG with REAL alpha (no baked checkerboard/white
background — the loader can key it, but real alpha is cleaner), character-matching low-poly
faceted style, side-view orthographic like the spy sheets.

## The color law (do not break)
Every interactive object is color-coded to a swipe gesture. The player is trained on this:

| Color | Hex | Meaning |
|---|---|---|
| GOLD | `#ffc233` | swipe UP (grapple points, telegraph arrows) & score/chips |
| CYAN | `#5fe0ff` | swipe DOWN (vents) + neutral architectural edge glow |
| MAGENTA | `#ff3d9a` | swipe RIGHT (locked doors, dive windows) |

Palette (current): deep navy shells `#0d1132`, back walls `#0e1334`/`#101538`, slab concrete
`#1e2856`, structure `#1a2350`/`#1c2450`, accents `#232d5e`/`#28325e`/`#333f74`,
interior black `#060a22`, slate dim `#8fa0d6`, night sky `#05082a→#04061a`.
Character rim light is magenta/cyan — environment should echo that (cool navy masses, thin neon edges).

**Leave animated glow OUT of the assets** — pulses, light shafts, searchlights, lamp pools and
marker pulsing are rendered procedurally on top. Bake only subtle AO/shading.

---

## 1. Architecture (tileable)

| # | Asset | Logical size | Export @4× | Notes |
|---|---|---|---|---|
| 1 | Floor/ceiling slab strip | 26 tall, tileable width | 512w × 104h seamless | Concrete `#1e2856`; game adds 2.5px cyan top-edge glow line + 5px dark underside. Damage nicks welcome. |
| 2 | Back wall panel | 224 tall, tileable width | 896h × ~896w seamless | Corridor interior wall `#0e1334` (alt tint `#101538`). Dilapidated: cracked plaster, exposed patches, stains, 26px grimy baseboard at bottom. Two tint variants ideal. |
| 3 | Roof clutter set | antenna: 8×34 post + 28×8 bar | ~160×200 sheet | Dark silhouettes `#131b44` against sky. 2–3 variants (antenna, vent stack, water tank). |
| 4 | Broken facade edge | 30 wide × 750 tall | 120×3000 (or 3 stackable chunks) | Jagged torn-open building edge where corridors meet the gap. Left & right (mirrorable). |

## 2. Back-wall dressing

| # | Asset | Logical size | Export @4× | Notes |
|---|---|---|---|---|
| 5 | Window, intact | 56–84w × 92h (make 84×92) | 336×368 | Dark opening `#070b26`, faint blue glass, thin frame + center mullion, 1–2 tiny lit city dots inside. |
| 6 | Window, broken | 84×92 | 336×368 | Same frame, shattered pane / crack web. ~45% of windows use this. |
| 7 | Ceiling strip lamp | 40×10 (housing 40×6 + tube 32×3) | 160×40 | Emissive tube `#bfeaff`. The flicker + 120px radial light pool is procedural — no baked glow. |
| 8 | Wreckage mounds (off-path floors) | 50–110w × 24–54h | 3 variants ~440×216 | Flat dark silhouettes `#161e46`, non-interactive background rubble. |

## 3. Interactive objects (gameplay-critical readability)

| # | Asset | Logical size | Export @4× | Notes |
|---|---|---|---|---|
| 9 | Rubble hop pile | 48w × 52h (+rebar poking ~16 above) | 192×272 | The jumpable rock. Mound `#28325e`, chunk facets `#333f74`, one rebar stick. Must read at speed as "small, hoppable". |
| 10 | Locked door — LOCKED | 30w × 224h | 120×896 | Metal slab `#232b58`, inner panel `#2f3a70`, keypad (2 bars 12×4 @ 96/86 above floor). Frame glow is MAGENTA and pulses procedurally — bake the door, thin magenta trim OK, no bloom. |
| 11 | Locked door — BLASTED | 30w × 224h | 120×896 | Aftermath: two 8w frame posts + twisted remains. Smoke is procedural. |
| 12 | Vent duct — 3-slice | mouth 64h; duct body 160h above it; total 224h. Entry cap ~40w, tileable mid, exit cap ~40w | caps 160×896, mid 256×896 seamless | Massive riveted duct (`#1c2450`, rivet strips every 58) squatting to 64px crawl height; tunnel interior `#060a22`. Cyan slat frames at mouth/exit (game pulses them). Length varies 270–390 → must tile. |
| 13 | Grapple rubble ramp | 130w × 96h | 520×384 | Rubble pile against wall column. Gold accent allowed (up = gold). Light shaft from above is procedural. |
| 14 | Ceiling break (hole) | 146w × 26h slab gap | 584×104 | Jagged-edged hole through a slab — two torn edge pieces that cap a transparent gap. |
| 15 | Interior wall column | 30w × 224h | 120×896 | Generic corridor-blocking wall (used behind grapple ramps & vents). `#1c2450` with dark edge. |
| 16 | Staircase (UP left→right) | 310w × 250h, 8 steps (~39×31 each) | 1240×1000 | Steps `#232d5e` with lit noses (game tints gold/cyan), solid under-mass `#1a2350`, glowing handrail 46 above the diagonal (game draws the glow — bake the rail bar only). DOWN version = same asset descending left→right (separate export unless mirrorable). |
| 17 | Dive window (building-end) — INTACT | wall cap 34w × 224h, pane 26×182 | 136×896 | Glass pane with sheen; frame is GOLD-trimmed magenta-gesture… **trim MAGENTA** (right-swipe family). Game pulses the frame. |
| 18 | Dive window — SHATTERED | 34×224 | 136×896 | Blown-out hole, glass teeth on the frame. Needed for both near & far facade (same asset). |

## 4. Pickups & telegraphs

| # | Asset | Logical size | Export @4× | Notes |
|---|---|---|---|---|
| 19 | Data chip | 20w × 26h | 80×104 | Gold faceted diamond/holo-chip, bright inner facet `#fff2c9`. Game spins it by x-scale + bobs + glow. |
| 20 | Telegraph arrows ×3 | ~40w × 32h each | 160×128 each | UP chevron (gold), DOWN chevron (cyan), FORWARD chevron (magenta). Painted/stencil-sprayed-on-wall look. Game pulses alpha in a marching sequence; soft backdrop blob is procedural. |

## 5. Backdrop

| # | Asset | Logical size | Export @4× | Notes |
|---|---|---|---|---|
| 21 | Far city skyline strip | buildings 40–100w × 60–200h, strip ~1000w | 4000×1000 seamless | Flat silhouettes `#0b1240` w/ sparse tiny cyan window dots. Parallax layer seen through gaps. |
| 22 | Street surface (gap floor) | 240–330w segments, tileable | 512×160 | `#0a0e28` + cyan top edge. Seen far below between buildings. Razor-wire / barricade clutter optional. Searchlight cone is procedural. |

## Delivery
- Drop files in `spy-dash/art/env/` — any clear names work; I'll wire them with the same
  loader (fallback to procedural until each lands, so partial deliveries are fine).
- Real alpha strongly preferred. If a generator bakes a background, keep it PURE white or a
  checkerboard — the keyer handles those.
- Tileables must be seamless horizontally. 3-slice pieces (vent) need caps + middle as separate files.
- Two-state objects (doors, dive windows) as separate files per state.
