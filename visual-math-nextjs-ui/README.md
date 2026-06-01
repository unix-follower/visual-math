# Visual Math Next.js UI

This package now contains the completed Phase 4 Next.js + Canvas surface, the completed Phase 5 Next.js + WebGPU baseline, and the completed Phase 6 Next.js + WebGL baseline for the Visual Math workspace. The app now has a shared React workbench layer, eleven live Canvas routes, thirteen live WebGPU routes, and eighteen live WebGL routes.

## What Exists Today

Phase 4 Canvas routes:

- Graph Traversal Lab
- Partial Derivatives Lab
- Distribution Lab
- Limits Lab
- Integral Lab
- Sampling Lab
- Vector Explorer
- Quadratic Plotter
- Unit Circle
- Triangle Explorer
- Derivative Lab

Shared infrastructure:

- Reusable React workbench shell
- Shared range and toggle controls
- Shared preset, metrics, viewport, and action surfaces
- Serializable scene state for share links
- PNG export helper
- Keyboard stepping helper for numeric controls
- Browser-safe Canvas rendering guard for test environments
- Shared WebGPU bootstrap and cached resource helpers
- Shared WebGL program and binding helpers
- Shared WebGL bootstrap and cached resource helpers
- Focused shared WebGL program and binding helper tests
- Focused shared WebGPU bootstrap and renderer-helper tests
- Focused shared WebGL bootstrap and renderer-helper tests
- Focused route-local GPU coverage for Foundation, Gradient Quad, Indexed Polygon, Uniform Transform, and Pulse Diamond scene/renderer helpers
- Focused route-local GPU coverage for Instanced Lattice, Storage Palette, Indirect Ribbon, and Indirect Indexed Polygon scene/renderer helpers
- Focused route-local GPU coverage for Texture Grid, Sampler Wave, Dual Pass, and Compute Ripple scene/renderer helpers
- Focused route-local WebGL coverage for Foundation clear-pass rendering and fallback behavior
- Focused route-local WebGL coverage for Gradient Triangle shader, vertex-buffer, and fallback behavior
- Focused route-local WebGL coverage for Uniform Transform matrix-uniform updates, static mesh reuse, and fallback behavior
- Focused route-local WebGL coverage for Indexed Polygon index-buffer draws, shared-vertex reuse, and fallback behavior
- Focused route-local WebGL coverage for Texture Grid texture uploads, sampled quad rendering, and fallback behavior
- Focused route-local WebGL coverage for Perspective Camera projected view matrices, layered geometry, and fallback behavior
- Focused route-local WebGL coverage for Depth Prism depth testing, shaded solid faces, and fallback behavior
- Focused route-local WebGL coverage for Lit Material fragment lighting, material uniforms, and fallback behavior
- Jest + React Testing Library coverage for the live routes and home page

Phase 5 WebGPU routes:

- WebGPU Compute Ripple
- WebGPU Dual Pass
- WebGPU Sampler Wave
- WebGPU Texture Grid
- WebGPU Indirect Indexed Polygon
- WebGPU Indirect Ribbon
- WebGPU Storage Palette
- WebGPU Instanced Lattice
- WebGPU Pulse Diamond
- WebGPU Uniform Transform
- WebGPU Indexed Polygon
- WebGPU Gradient Quad
- WebGPU Foundation

Phase 6 WebGL routes:

- WebGL Multi-Obstacle Flow
- WebGL Interactive Dye
- WebGL Velocity Field
- WebGL Temporal Feedback
- WebGL Feedback Trails
- WebGL Ping-Pong Feedback
- WebGL Bloom Blur
- WebGL Dual Pass
- WebGL Textured Material
- WebGL Shadow Relief
- WebGL Lit Material
- WebGL Depth Prism
- WebGL Perspective Camera
- WebGL Texture Grid
- WebGL Indexed Polygon
- WebGL Uniform Transform
- WebGL Gradient Triangle
- WebGL Foundation

## Getting Started

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The current live Phase 4 routes are available at [http://localhost:3000/discrete-math/graph-traversal-lab](http://localhost:3000/discrete-math/graph-traversal-lab), [http://localhost:3000/multivariable-calculus/partial-derivatives-lab](http://localhost:3000/multivariable-calculus/partial-derivatives-lab), [http://localhost:3000/statistics-probability/distribution-lab](http://localhost:3000/statistics-probability/distribution-lab), [http://localhost:3000/calculus/limits-lab](http://localhost:3000/calculus/limits-lab), [http://localhost:3000/calculus/integral-lab](http://localhost:3000/calculus/integral-lab), [http://localhost:3000/statistics-probability/sampling-lab](http://localhost:3000/statistics-probability/sampling-lab), [http://localhost:3000/linear-algebra/vector-explorer](http://localhost:3000/linear-algebra/vector-explorer), [http://localhost:3000/algebra/quadratic-plotter](http://localhost:3000/algebra/quadratic-plotter), [http://localhost:3000/trigonometry/unit-circle](http://localhost:3000/trigonometry/unit-circle), [http://localhost:3000/geometry/triangle-explorer](http://localhost:3000/geometry/triangle-explorer), and [http://localhost:3000/calculus/derivative-lab](http://localhost:3000/calculus/derivative-lab). The live Phase 5 routes are available at [http://localhost:3000/phase-5/webgpu-foundation](http://localhost:3000/phase-5/webgpu-foundation), [http://localhost:3000/phase-5/webgpu-gradient-quad](http://localhost:3000/phase-5/webgpu-gradient-quad), [http://localhost:3000/phase-5/webgpu-indexed-polygon](http://localhost:3000/phase-5/webgpu-indexed-polygon), [http://localhost:3000/phase-5/webgpu-uniform-transform](http://localhost:3000/phase-5/webgpu-uniform-transform), [http://localhost:3000/phase-5/webgpu-pulse-diamond](http://localhost:3000/phase-5/webgpu-pulse-diamond), [http://localhost:3000/phase-5/webgpu-instanced-lattice](http://localhost:3000/phase-5/webgpu-instanced-lattice), [http://localhost:3000/phase-5/webgpu-storage-palette](http://localhost:3000/phase-5/webgpu-storage-palette), [http://localhost:3000/phase-5/webgpu-indirect-ribbon](http://localhost:3000/phase-5/webgpu-indirect-ribbon), [http://localhost:3000/phase-5/webgpu-indirect-indexed-polygon](http://localhost:3000/phase-5/webgpu-indirect-indexed-polygon), [http://localhost:3000/phase-5/webgpu-texture-grid](http://localhost:3000/phase-5/webgpu-texture-grid), [http://localhost:3000/phase-5/webgpu-sampler-wave](http://localhost:3000/phase-5/webgpu-sampler-wave), [http://localhost:3000/phase-5/webgpu-dual-pass](http://localhost:3000/phase-5/webgpu-dual-pass), and [http://localhost:3000/phase-5/webgpu-compute-ripple](http://localhost:3000/phase-5/webgpu-compute-ripple).

## Validation

Primary validation command:

```bash
npm test
```

Current verified result: `64` passing test files and `159` passing tests.

## Build

Create a production build:

```bash
npm run build
```

## Phase 4 Status

Phase 4 is complete with `/discrete-math/graph-traversal-lab`, `/multivariable-calculus/partial-derivatives-lab`, `/statistics-probability/distribution-lab`, `/calculus/limits-lab`, `/calculus/integral-lab`, `/statistics-probability/sampling-lab`, `/linear-algebra/vector-explorer`, `/algebra/quadratic-plotter`, `/trigonometry/unit-circle`, `/geometry/triangle-explorer`, and `/calculus/derivative-lab`, giving the Next.js surface five daily-math slices, one weekly probability slice, one weekly multivariable calculus slice, one weekly discrete-math slice, and three weekly calculus slices. Together the current files verify route-local model and renderer splits, a shared workbench shell, serialized URL state, PNG export, reset, presets, metrics, keyboard interaction, and Canvas-safe tests under `jsdom`.

## Phase 5 Status

Phase 5 is complete with `/phase-5/webgpu-foundation`, `/phase-5/webgpu-gradient-quad`, `/phase-5/webgpu-indexed-polygon`, `/phase-5/webgpu-uniform-transform`, `/phase-5/webgpu-pulse-diamond`, `/phase-5/webgpu-instanced-lattice`, `/phase-5/webgpu-storage-palette`, `/phase-5/webgpu-indirect-ribbon`, `/phase-5/webgpu-indirect-indexed-polygon`, `/phase-5/webgpu-texture-grid`, `/phase-5/webgpu-sampler-wave`, `/phase-5/webgpu-dual-pass`, and `/phase-5/webgpu-compute-ripple`, giving the Next.js surface the full Angular-parity WebGPU baseline. The current files establish shared WebGPU adapter and device initialization, browser-safe support checks, cached resource helpers, focused shared-helper coverage for bootstrap and resource caching, route-local model, page, and renderer coverage across all thirteen WebGPU routes, shader-backed triangle, quad, indexed, uniform-buffer, animated, instanced, storage-buffer, indirect, texture-upload, sampler-filtered, offscreen multi-pass, and compute-driven pipelines, route-local scene serialization, and unsupported-browser fallback behavior inside the same shared React workbench shell used by Phase 4.

## Phase 6 Status

Phase 6 is complete with `/phase-6/webgl-foundation`, `/phase-6/webgl-gradient-triangle`, `/phase-6/webgl-uniform-transform`, `/phase-6/webgl-indexed-polygon`, `/phase-6/webgl-texture-grid`, `/phase-6/webgl-perspective-camera`, `/phase-6/webgl-depth-prism`, `/phase-6/webgl-lit-material`, `/phase-6/webgl-shadow-relief`, `/phase-6/webgl-textured-material`, `/phase-6/webgl-dual-pass`, `/phase-6/webgl-bloom-blur`, `/phase-6/webgl-ping-pong-feedback`, `/phase-6/webgl-feedback-trails`, `/phase-6/webgl-temporal-feedback`, `/phase-6/webgl-velocity-field`, `/phase-6/webgl-interactive-dye`, and `/phase-6/webgl-multi-obstacle-flow`, giving the Next.js surface the full eighteen-route Angular-parity WebGL2 baseline on top of the completed Canvas and WebGPU tracks. The current files establish shared WebGL2 support detection, guarded context acquisition, canvas-size synchronization, runtime render tracking, shared shader-program and interleaved-attribute helpers, route-local model plus page coverage, route-local clear-pass, first geometry-draw, first uniform-driven transform, first indexed-draw, first texture-upload, first perspective-camera, first depth-tested solid, first fragment-lit material, first relief-shaded height-field, first texture-backed shaded material, first offscreen framebuffer composite, first blur-lifted bloom post-process renderer coverage, first two-target ping-pong feedback renderer coverage, first repeated-relay feedback-trail renderer coverage, first frame-persistent temporal feedback renderer coverage, first synthetic velocity-field advection coverage, pointer-driven interactive dye injection, dual-obstacle nearest-drag flow control, unsupported-browser fallback behavior, and home-page navigation for the live WebGL routes inside the same shared React workbench shell used by earlier phases.

## Phase 4 Acceptance Criteria

Phase 4 should be considered complete when the Next.js Canvas app satisfies all of the following:

- Each targeted daily and weekly category has at least one representative, test-backed visualization slice.
- Every live slice uses the shared React workbench shell for controls, presets, viewport, metrics, and notes.
- Scene state can be serialized and restored for share links.
- PNG export and reset actions work consistently across slices.
- Keyboard interaction is available for viewport-focused core parameters.
- Canvas rendering safely no-ops under `jsdom` so tests remain deterministic.
- The Next.js home page exposes all implemented slices through navigation and the overview page.
- Model logic and top-level route rendering are covered by automated tests.
- The baseline validation commands pass: `npm test` and `npm run build`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

## Next Work

- Keep the completed Phase 4, Phase 5, and Phase 6 surfaces stable while later phases branch from the shared workbench contract
