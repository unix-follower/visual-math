# Visual Math Angular UI

This package now contains the completed Phase 1 Angular + Canvas reference implementation, the completed Phase 2 Angular + WebGPU route baseline, and the completed Phase 3 Angular + WebGL baseline, all inside the same standalone-component workbench shell.

## What Exists Today

Implemented Canvas feature slices:

- Quadratic Plotter
- Derivative Lab
- Integral Lab
- Limits Lab
- Graph Traversal Lab
- Triangle Explorer
- Unit Circle Explorer
- Sampling Lab
- Distribution Lab
- Vector Explorer
- Partial Derivatives Lab
- Modular Arithmetic Lab
- Payoff Matrix Lab
- Euler Characteristic Lab
- Gradient Descent Lab

Phase 2 WebGPU routes:

- WebGPU Foundation
- WebGPU Gradient Quad
- WebGPU Indexed Polygon
- WebGPU Instanced Lattice
- WebGPU Indirect Ribbon
- WebGPU Indirect Indexed Polygon
- WebGPU Pulse Diamond
- WebGPU Uniform Transform
- WebGPU Storage Palette
- WebGPU Texture Grid
- WebGPU Sampler Wave
- WebGPU Dual Pass
- WebGPU Compute Ripple

Phase 3 WebGL routes:

- Phase 3 Index
- WebGL Foundation
- WebGL Gradient Triangle
- WebGL Uniform Transform
- WebGL Indexed Polygon
- WebGL Texture Grid
- WebGL Perspective Camera
- WebGL Depth Prism
- WebGL Lit Material
- WebGL Shadow Relief
- WebGL Textured Material
- WebGL Dual Pass
- WebGL Bloom Blur
- WebGL Ping-Pong Feedback
- WebGL Temporal Feedback
- WebGL Feedback Trails
- WebGL Velocity Field
- WebGL Interactive Dye
- WebGL Multi-Obstacle Flow

Shared infrastructure:

- Reusable math workbench shell
- Shared range/toggle/preset/viewport components
- Serializable scene state for share links
- PNG export helper
- Shared keyboard stepping helper for numeric controls
- Route-level integration coverage and pure model specs

## Development

Start the Angular dev server:

```bash
npm install
npm start
```

Open `http://localhost:4200/` after the dev server starts.

## Validation

Primary validation command:

```bash
npm test -- --watch=false
```

Current verified result: `124` passing test files and `364` passing tests.

## Build

Create a production build:

```bash
npm run build
```

## Phase 1 Quality Bar

Each feature page should:

- Use the shared workbench shell
- Keep model logic in pure TypeScript helpers
- Render through Canvas or WebGPU with environment-safe guards in tests
- Expose presets, keyboard shortcuts, metrics, summary text, reset, share, and PNG export
- Be covered by model specs and route integration coverage where applicable

## Phase 2 Status

Phase 2 is complete for the Angular app at the planned baseline level and now spans these WebGPU concepts inside the Angular workbench shell:

- pipeline-backed triangle setup
- interpolated gradient quads
- indexed geometry
- instanced geometry
- indirect draw submission
- indirect indexed draw submission
- animated vertex updates
- uniform-buffer transforms
- storage-buffer palette data
- uploaded textures
- sampler-filtered textures
- dual-pass offscreen compositing
- compute-pass generated vertex data

Each WebGPU slice keeps the same route-local `model` / `scene` / `renderer` / `page` split, guarded runtime bootstrap, cached GPU resources, and explicit teardown coverage.

## Phase 3 Status

Phase 3 is complete at the planned Angular WebGL baseline and now includes `/phase-3`, `WebGL Foundation`, `WebGL Gradient Triangle`, `WebGL Uniform Transform`, `WebGL Indexed Polygon`, `WebGL Texture Grid`, `WebGL Perspective Camera`, `WebGL Depth Prism`, `WebGL Lit Material`, `WebGL Shadow Relief`, `WebGL Textured Material`, `WebGL Dual Pass`, `WebGL Bloom Blur`, `WebGL Ping-Pong Feedback`, `WebGL Temporal Feedback`, `WebGL Feedback Trails`, `WebGL Velocity Field`, `WebGL Interactive Dye`, and `WebGL Multi-Obstacle Flow`. Together they verify guarded WebGL2 context setup, shared workbench integration, URL-serializable scene state, PNG export, a clear-pass render path, shader compilation, program linking, shared shader/program/buffer plus binding helpers, vertex-buffer uploads, matrix-uniform transforms, indexed geometry, texture uploads, a reusable fullscreen composite quad helper, a reusable render-target helper, a reusable fullscreen post-process helper, perspective cameras, depth-tested solid geometry, three lighting/material routes including shadow-relief and texture-backed multi-light shading, and eight offscreen multi-pass draws for compositing, blur-shaped post-processing, first-pass feedback relays, frame-stepped persistence, longer trail chains, simulation-style velocity-field advection, direct pointer-driven dye injection around a draggable obstacle, and a stronger two-obstacle interaction surface.

## Next Work

- Continue polish, copy cleanup, and usability passes across the Angular shell
- Prepare parity work for later renderer targets
