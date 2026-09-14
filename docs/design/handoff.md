# Handoff: Isometric Pixel-Art Office Floor

## Overview
A single-image illustration of one office floor viewed isometrically, in a flat pixel-art / game style (inspired by cozy isometric office illustrations). One L-shaped floor plate divided into 6 rooms plus a connecting corridor, each room furnished differently. Intended as a static illustration / hero graphic, not an interactive UI.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and composition, not production code to copy directly. The scene is built entirely from CSS 3D transforms (nested `preserve-3d` divs). The task is to **recreate this design in the target environment** — e.g. as rendered pixel art, SVG, a canvas/WebGL scene, or a game engine tilemap — using whatever the project's established stack is. If no environment exists yet, choose the most appropriate one for an illustration asset (a raster illustration or an HTML/CSS or SVG recreation are both fine).

## Fidelity
**Mid-fidelity.** The layout, room program, palette, and furniture placement are intentional and should be kept. The rendering itself (CSS boxes) approximates a pixel-art style; the final artwork should push further toward the reference style: chunky outlines, dithered shading, saturated flat fills.

## Scene structure

### Geometry conventions (as built in HTML)
- Floor plan: 960 × 640 px, viewed with `perspective: 1700px; transform: rotateX(58deg) rotateZ(-45deg)`.
- Every wall/furniture piece is a plan-view rectangle extruded to a height h:
  - Top face: the plan rect at `translateZ(h)`.
  - South face: div at the rect's south edge, height h, `transform-origin: 0 0; rotateX(90deg)`.
  - East face: div at the rect's east edge, width h, `transform-origin: 0 0; rotateY(-90deg)`.
- Camera sees the south and east faces; north/west faces are omitted.
- Exterior north + west walls are tall (120px); south/east edges are low cut rims (22px) so the interior reads like a cutaway dollhouse.
- Interior partition walls: 70px tall, 12px thick, with door gaps (70px wide openings).

### Floor plan (L-shaped; bottom-right notch is cut away)
Top row (y 0–260): three rooms split at x=314 and x=634.
Corridor (y 272–368): full width, runs east–west, connects everything through door gaps.
Bottom wing (y 380–640, x 0–652 only): three smaller rooms split at x=294 and x=464.

### Rooms
1. **Manager office** (top-left) — blue-grey tile floor, large navy rug, dark bookshelf against west wall, big desk with monitor + paper, executive chair, plant, framed chart on north wall.
2. **Meeting room** (top-center) — orange floor (#cf7a35), long wood table with laptop, 4 blue chairs, large whiteboard on north wall.
3. **Workspace** (top-right) — blue-grey tile, two desks each with monitor + keyboard (one with red mug), 2 chairs, sticky notes scattered on the north wall (yellow/teal/orange/purple), plant in corner.
4. **Break room** (bottom-left) — light checkerboard tile, kitchen counter along west wall (sink + microwave), fridge, round table with coffee mug + plate, 2 warm-yellow stools.
5. **Focus room** (bottom-middle) — small room, orange rug, single desk with green-tinted monitor and desk lamp, chair, plant.
6. **IT / server room** (bottom-right of the wing) — dark floor, two tall black server racks with glowing status LEDs (green/yellow/red), operator desk with green terminal screen + keyboard, chair.
7. **Corridor** — concrete-blue runner strip, water cooler at the east end.

Windows: three 140px-wide windows on the tall north wall (white frames, sky-blue gradient glass, soft glow).

## Design tokens
Palette (hex):
- Background: radial #2a3a5e → #1e2b47 → #182338
- Exterior wall top #7b96bd, south faces #5877a3, east faces #44608a / #3f597f, baseboard #31486b
- Floors: blue-grey tile #7d90ad, orange #cf7a35, checker #b9c1cd / #9aa4b4, dark IT #3c4a63, corridor #5c6f8d / #516481
- Wood furniture: top #c98a4b, south #a76e35, east #8a5a2a (manager desk darker: #a76e35/#8a5a2a/#6f4620)
- Chairs: #3c5a8c / #314971; stools #d9963f / #b3782c
- Screens: monitor blue #6fc0ea, mint #a5e6c8, terminal green #5fe089, all with matching glow shadows and #2b3242 bezels
- Accents: mug red #e06a55, rug red #8d3f3a, rug green #4d7a6a, plant #5fa06a→#2f6b43, pot #b4543f, sticky notes #f2d24b #7fd4c1 #e08a5a #c9a2ee
- Window glass: #cfe4f5 → #8fb4d8, frame #e8ecf2
- Label text: 'DM Mono' monospace, #9aa1b2

## Interactions & state
None — static illustration. (Optional future: hover-highlight per room, or subtle screen-flicker/LED-blink animations.)

## Files
- `Pixel Office Rooms.dc.html` — the furnished L-shaped floor (primary deliverable). Markup between `<x-dc>` tags is plain HTML with inline styles.
- `Pixel Office Scene.dc.html` — earlier structure-only version (7 empty rooms, rectangular plate), kept for reference.

Open either file in a browser to view. All geometry is inline-styled divs; no JS is required for the scene itself.
