# Aurelia Orbital Works

A single-page, retro-futuristic mission console inspired by *Juno: New Origins*. It combines an orbitable Three.js space scene with five working console panels: rocket configuration, transfer plotting, a lightweight physics estimator, a lazy-loaded fact archive and a flight deck with a flyable launch.

Built with classic scripts, local fonts and a local Three.js build. There is no build step.

## Run it

Serve the folder over HTTP so the lazy-loaded archive and local fonts load correctly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
```

Then open <http://localhost:4173/>.

Any static server works too, for example:

```powershell
python -m http.server 4173
```

Opening `index.html` directly from disk works for the main scene, but the fact archive is loaded as a separate script and may be blocked by the browser's `file://` rules.

## What is inside

- `index.html` — page structure, all five panels and scene HUD.
- `styles.css` — palette, layout, responsive rules and motion.
- `app.js` — Three.js scene, orbit camera, tabs, rocket preview, transfer solver, physics, archive and the arcade flight model.
- `data/facts.js` — fact archive, fetched only when the Nerd Facts tab is opened.
- `three.min.js` — local Three.js r152 UMD build.
- `assets/fonts/` — local WOFF2 files for Inter, Space Grotesk and IBM Plex Mono.
- `serve.ps1` — small PowerShell static server used for local previews.

## Controls

- Click the five tabs, or use the arrow, Home and End keys while a tab has focus.
- **Scene (CAD-style navigation)** — drag with the left mouse button to orbit, drag with the right button or hold Shift to pan, roll the wheel to dolly in and out, and pinch on a trackpad or touch screen to zoom. Chapter captions follow camera distance, not page scroll; the page itself never scrolls. Click the **Aurelia Prime** tag to fly back to the home framing.
- **Rocket Creator** — pick one of five airframes, a finish (or a custom color) and one of four engines. The preview only rebuilds when **Apply configuration** is pressed.
- **Trajectory** — choose a destination from the list or the chart to update the dashed transfer and readouts.
- **Physics Spec** — drag the mass, propellant, thrust and specific-impulse sliders. Values recalculate after a 140 ms debounce.
- **Nerd Facts** — filter by category and step through facts with the arrow buttons. The archive script loads on first use.
- **Flight Deck** — the vehicle stands on Pad 04. Press **Initiate launch**, then fly it:
  - `A` / `D` (or the arrow buttons) pitch the vehicle left and right.
  - `W` / `S` raise and lower the throttle, `X` cuts the engine; the throttle slider does the same.
  - Pitch over to trade climb for sideways speed. Insertion is declared at 70 km with at least 1.4 km/s of sideways velocity.
  - **Recover** returns the vehicle to the pad at any time.
- The round speaker button in the top bar enables a quiet WebAudio drone after a click.

## Performance notes

- The scene is static geometry plus small shaders. The planet is a single canvas-textured sphere; stars are one points cloud and the nebula is a handful of sprites.
- The camera is a simple spherical rig: orbit, pan and dolly only move three numbers, so navigation never allocates or rebuilds geometry.
- Star count is reduced by viewport size and camera distance. Pixel ratio is capped, and the renderer drops resolution and star count if measured FPS falls below 33.
- The rocket preview renders only when the creator is active, on resize, and on **Apply**. It is not part of the animation loop.
- Rocket models are kept around 2–2.5k triangles. Geometry is disposed when a new configuration is built.
- The launch is an arcade kinematic model on the existing render loop — gravity, drag, throttle, pitch and fuel. There is no physics engine and no real-time orbital simulation; the transfer paths are pre-computed and the physics panel uses the rocket equation.
- Fact content is loaded on demand and each fact is rendered as static HTML with inline SVG artwork.
- Ambient audio is not created until the user presses the sound button.

## Palette

`#8daa91` sage · `#788475` moss · `#5e5d5c` stone · `#453643` plum · `#28112b` deep plum.
Warm planet and ember accents are used sparingly to keep the retro-futurist feel.
