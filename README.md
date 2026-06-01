# Visual Math

Visual Math is a multi-platform math-visualization workspace intended to grow across web UI and desktop rendering stacks. The repository is organized by rendering/runtime target so the same conceptual tools can eventually be replicated across Angular, Next.js, WebGPU, WebGL, Vulkan, and OpenGL implementations.

## Workspace Layout

- `visual-math-angular-ui`: Phase 1 complete Angular + Canvas reference app, completed Phase 2 WebGPU route set, and completed Phase 3 WebGL baseline.
- `visual-math-nextjs-ui`: Phases 4, 5, and 6 are complete with a Next.js surface spanning eleven Canvas routes, thirteen WebGPU routes, and eighteen WebGL routes on the shared React workbench.
- `visual-math-vulkan`: Phase 7 native Vulkan target, now complete with a validated GLFW-backed renderer bootstrap, build-time SPIR-V shaders, validation toggles, resize-safe swapchain recreation, an animated uniform-driven gradient triangle, two indexed overlays plus an outline primitive, a dedicated fragment-shader material path with animated pulse speed, intensity, palette-bias, alpha-floor, and luminance-response controls, per-run runtime stats reporting, and CLI-driven scene overrides.
- `visual-math-opengl`: Phase 8 is complete with a reusable OpenGL core library, shared scene/config parity with Vulkan, two GLFW-backed animated scenes selected via `--scene-kind`, an externalized scene catalog, extracted renderer-configuration types in dedicated files, externalized GL resource helpers, externalized GL program helpers, a dedicated indexed material path, checked-in GLSL shader assets, a generated shader-asset manifest shared by build and runtime code, externalized renderer program configuration, externalized pass-resource configuration, an extracted renderer configuration model, startup/runtime reporting, and headless tests including shader-loading coverage.

## Delivery Phases

1. Angular + Canvas
2. Angular + WebGPU
3. Angular + WebGL
4. Next.js + Canvas
5. Next.js + WebGPU
6. Next.js + WebGL
7. Vulkan
8. OpenGL

## Phase 1 Status

Phase 1 is complete for the Angular reference app. The Canvas implementation now has a shared typed workbench shell, serializable scene state, export/share helpers, reusable controls, keyboard interaction helpers, route coverage, and passing model plus integration tests across every targeted frequency band.

Phase 2 is complete at the planned Angular WebGPU baseline. The current Angular WebGPU surface now includes `WebGPU Foundation`, `WebGPU Gradient Quad`, `WebGPU Indexed Polygon`, `WebGPU Instanced Lattice`, `WebGPU Indirect Ribbon`, `WebGPU Indirect Indexed Polygon`, `WebGPU Pulse Diamond`, `WebGPU Uniform Transform`, `WebGPU Storage Palette`, `WebGPU Texture Grid`, `WebGPU Sampler Wave`, `WebGPU Dual Pass`, and `WebGPU Compute Ripple`, all sharing the same runtime/bootstrap, cached-resource, and explicit-teardown patterns.

Phase 3 is complete at the planned Angular WebGL baseline inside the same Angular app with `WebGL Foundation`, `WebGL Gradient Triangle`, `WebGL Uniform Transform`, `WebGL Indexed Polygon`, `WebGL Texture Grid`, `WebGL Perspective Camera`, `WebGL Depth Prism`, `WebGL Lit Material`, `WebGL Shadow Relief`, `WebGL Textured Material`, `WebGL Dual Pass`, `WebGL Bloom Blur`, `WebGL Ping-Pong Feedback`, `WebGL Temporal Feedback`, `WebGL Feedback Trails`, `WebGL Velocity Field`, `WebGL Interactive Dye`, `WebGL Multi-Obstacle Flow`, and a dedicated `/phase-3` index route. The current WebGL surface establishes guarded WebGL2 initialization, a clear-pass baseline, shader compilation, program linking, extracted shared shader/program/buffer plus binding helpers, geometry-backed draws, indexed geometry, texture uploads, a reusable fullscreen composite quad helper, a reusable texture-plus-framebuffer render-target helper, a reusable fullscreen post-process helper, depth-tested solid geometry, perspective cameras, three lighting/material routes including shadow-relief and texture-backed multi-light shading, and eight offscreen multi-pass routes using the same workbench contract, including explicit pointer-driven dye injection and direct dragging of two flow obstacles.

Phase 4 is complete in the Next.js app with `Graph Traversal Lab` at `/discrete-math/graph-traversal-lab`, `Partial Derivatives Lab` at `/multivariable-calculus/partial-derivatives-lab`, `Distribution Lab` at `/statistics-probability/distribution-lab`, `Limits Lab` at `/calculus/limits-lab`, `Integral Lab` at `/calculus/integral-lab`, `Sampling Lab` at `/statistics-probability/sampling-lab`, `Vector Explorer` at `/linear-algebra/vector-explorer`, `Quadratic Plotter` at `/algebra/quadratic-plotter`, `Unit Circle` at `/trigonometry/unit-circle`, `Triangle Explorer` at `/geometry/triangle-explorer`, and `Derivative Lab` at `/calculus/derivative-lab`. The surface includes a reusable React workbench shell, browser-safe Canvas rendering guards, serialized scene state for share links, PNG export and reset actions, keyboard-driven viewport controls, and Jest plus React Testing Library coverage for the live routes and home page.

Phase 5 is complete in the Next.js app with `WebGPU Foundation` at `/phase-5/webgpu-foundation`, `WebGPU Gradient Quad` at `/phase-5/webgpu-gradient-quad`, `WebGPU Indexed Polygon` at `/phase-5/webgpu-indexed-polygon`, `WebGPU Uniform Transform` at `/phase-5/webgpu-uniform-transform`, `WebGPU Pulse Diamond` at `/phase-5/webgpu-pulse-diamond`, `WebGPU Instanced Lattice` at `/phase-5/webgpu-instanced-lattice`, `WebGPU Storage Palette` at `/phase-5/webgpu-storage-palette`, `WebGPU Indirect Ribbon` at `/phase-5/webgpu-indirect-ribbon`, `WebGPU Indirect Indexed Polygon` at `/phase-5/webgpu-indirect-indexed-polygon`, `WebGPU Texture Grid` at `/phase-5/webgpu-texture-grid`, `WebGPU Sampler Wave` at `/phase-5/webgpu-sampler-wave`, `WebGPU Dual Pass` at `/phase-5/webgpu-dual-pass`, and `WebGPU Compute Ripple` at `/phase-5/webgpu-compute-ripple`. The WebGPU surface now includes shared adapter/device bootstrap helpers, canvas configuration, cached resource helpers, focused shared-helper test coverage for bootstrap and renderer-resource behavior, focused route-local renderer coverage for every WebGPU route, shader-backed triangle, quad, indexed, uniform-buffer, animated, instanced, storage-buffer, indirect, texture-upload, sampler-filtered, offscreen multi-pass, and compute-driven pipelines, unsupported-browser fallback behavior, and route-local model plus page coverage while preserving the same React workbench shell and serialized scene-state contract used by Phase 4.

Phase 6 is complete in the Next.js app with `WebGL Foundation` at `/phase-6/webgl-foundation`, `WebGL Gradient Triangle` at `/phase-6/webgl-gradient-triangle`, `WebGL Uniform Transform` at `/phase-6/webgl-uniform-transform`, `WebGL Indexed Polygon` at `/phase-6/webgl-indexed-polygon`, `WebGL Texture Grid` at `/phase-6/webgl-texture-grid`, `WebGL Perspective Camera` at `/phase-6/webgl-perspective-camera`, `WebGL Depth Prism` at `/phase-6/webgl-depth-prism`, `WebGL Lit Material` at `/phase-6/webgl-lit-material`, `WebGL Shadow Relief` at `/phase-6/webgl-shadow-relief`, `WebGL Textured Material` at `/phase-6/webgl-textured-material`, `WebGL Dual Pass` at `/phase-6/webgl-dual-pass`, `WebGL Bloom Blur` at `/phase-6/webgl-bloom-blur`, `WebGL Ping-Pong Feedback` at `/phase-6/webgl-ping-pong-feedback`, `WebGL Feedback Trails` at `/phase-6/webgl-feedback-trails`, `WebGL Temporal Feedback` at `/phase-6/webgl-temporal-feedback`, `WebGL Velocity Field` at `/phase-6/webgl-velocity-field`, `WebGL Interactive Dye` at `/phase-6/webgl-interactive-dye`, and `WebGL Multi-Obstacle Flow` at `/phase-6/webgl-multi-obstacle-flow`. The completed WebGL surface now includes shared WebGL2 support detection, guarded context acquisition, canvas-size synchronization, runtime render tracking, shared shader-program and interleaved-attribute helpers, focused shared-helper coverage for bootstrap, program, binding, renderer-resource, offscreen render-target, and fullscreen post-process behavior, focused route-local model/page/renderer coverage for all eighteen WebGL routes, unsupported-browser fallback behavior, home-page navigation, pointer-driven interactive dye injection, and nearest-obstacle drag control while preserving the same React workbench shell and serialized scene-state contract used by Phases 4 and 5.

## Phase 4 Acceptance Criteria

Phase 4 should be considered complete when the Next.js Canvas app satisfies all of the following:

- Each targeted daily and weekly category has at least one representative, test-backed visualization slice.
- Every slice uses the shared React workbench shell for controls, presets, viewport, metrics, and notes.
- Scene state can be serialized/deserialized for share links.
- PNG export and reset actions work consistently across slices.
- Keyboard interaction is available for the viewport-focused core parameters.
- Canvas rendering safely no-ops under `jsdom` so tests remain deterministic.
- The Next.js route shell exposes all implemented slices through navigation and the overview page.
- Model logic and top-level route rendering are covered by automated tests.
- The baseline validation commands pass: `cd /Users/Artsem_Nikitsenka/visual-math/visual-math-nextjs-ui && npm test` and `cd /Users/Artsem_Nikitsenka/visual-math/visual-math-nextjs-ui && npm run build`.

Phase 7 is complete at the planned Vulkan bootstrap milestone. The native Vulkan surface now includes a reusable core library, GLFW-backed window/surface bootstrap, swapchain/render-pass/framebuffer lifecycle, validation toggles, resize-safe recreation, a uniform-driven animated gradient triangle, two indexed overlays, an outline primitive, shared scene-configured material tuning, CLI scene overrides, per-run runtime stats reporting, and automated coverage for the pure scene/render-state helpers.

Phase 8 is complete in the OpenGL target with a reusable `visual_math_opengl_core` library, a port of the pure Phase 7 scene/config and CLI parsing layers, and a `GLApp` renderer that creates a GLFW-backed OpenGL context and draws two scene families selected with `--scene-kind=gradient-triangle|constellation`. Both scenes share the same pulse-tuned indexed-material path, checked-in GLSL assets resolved from disk at runtime, one extracted renderer configuration model that owns program, draw-pass, and geometry-resource specifications, an externalized scene catalog that maps scene kinds to reusable geometry builders outside `GLApp`, dedicated renderer-configuration files so the data model is no longer implementation-local to `gl_app.cpp`, dedicated GL resource-helper files so geometry upload plus VAO/VBO lifecycle work no longer live beside the app loop, and dedicated GL program-helper files so shader loading, compile/link, uniform discovery, binding, and teardown no longer live there either. The current packaging workflow keeps raw GLSL assets in-repo, copies them into `build/shaders`, and generates a canonical shader-asset manifest consumed by runtime code so build and execution stay aligned. Headless GoogleTests now cover scene math, geometry generation for both scene kinds, launch parsing including scene-kind validation, shader-directory resolution, copied shader-asset presence, the scene-catalog surface, the renderer-configuration surface, the GL resource-helper surface, and the GL program-helper surface.

### Implemented Slices

Daily math:
- Algebra: Quadratic Plotter
- Linear Algebra: Vector Explorer
- Geometry: Triangle Explorer
- Trigonometry: Unit Circle Explorer
- Statistics: Sampling Lab

Weekly math:
- Calculus: Derivative Lab
- Calculus: Integral Lab
- Calculus: Limits Lab
- Multivariable Calculus: Partial Derivatives Lab
- Probability: Distribution Lab
- Discrete Math: Graph Traversal Lab

Monthly math:
- Number Theory: Modular Arithmetic Lab
- Game Theory: Payoff Matrix Lab

Rare math:
- Topology: Euler Characteristic Lab

Domain-specific math:
- Optimization: Gradient Descent Lab

## Phase 1 Acceptance Criteria

Phase 1 should be considered complete when the Angular Canvas app satisfies all of the following:

- Each prioritized frequency band has at least one representative, test-backed visualization slice.
- Every slice uses the shared workbench shell for controls, presets, viewport, metrics, and notes.
- Scene state can be serialized/deserialized for share links.
- PNG export and reset actions work consistently across slices.
- Keyboard interaction is available for the viewport-focused core parameters.
- Canvas rendering safely no-ops under `jsdom` so tests remain deterministic.
- The Angular route shell exposes all implemented slices through navigation and the overview page.
- Model logic and top-level route rendering are covered by automated tests.
- The baseline validation command passes: `cd /Users/Artsem_Nikitsenka/visual-math/visual-math-angular-ui && npm test -- --watch=false`.

## Next Work

- Phases 4, 5, and 6 are complete with eleven live Next.js Canvas routes, thirteen live Next.js WebGPU routes, and eighteen live Next.js WebGL routes.
- Keep the completed Next.js Canvas, WebGPU, and WebGL surfaces stable while later native phases continue.

## Current Validation

Latest verified Angular result:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-angular-ui
npm test -- --watch=false
```

Result: `124` test files passed, `364` tests passed.

Latest verified Next.js result:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-nextjs-ui
npm test
```

Result: `64` test files passed, `159` tests passed.

Latest verified Vulkan result:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-vulkan
./build.sh
```

Result: CMake configure and native build passed, and `ctest --preset=vcpkg` passed with `11` tests.

Additional verified Vulkan smoke command:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-vulkan
./build/visual_math_vulkan --frames=1
```

Result: the executable initialized GLFW, Vulkan surface/device/swapchain resources, loaded compiled SPIR-V shaders, rendered one frame with two indexed overlays plus the triangle and outline path, printed runtime stats for the completed run, and exited cleanly.

Additional verified Vulkan animation command:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-vulkan
./build/visual_math_vulkan --frames=1 --animation-speed=90 --scene-rotation=0
```

Result: the executable accepted the animation override, reported the configured animation speed in startup output, rendered one frame, and exited cleanly.

Additional verified Vulkan material-pulse command:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-vulkan
./build/visual_math_vulkan --frames=1 --animation-speed=45 --material-pulse-speed=2.5 --material-pulse-intensity=0.4 --material-palette-bias=0.65 --material-alpha-floor=0.78 --material-luminance-response=0.3 --scene-accent=0.6
```

Result: the executable accepted the transform and material pulse speed, intensity, palette-bias, alpha-floor, and luminance-response overrides, reported the configured values in startup output, rendered one frame with two indexed overlays plus the triangle and outline path, printed runtime stats for the completed run, and exited cleanly.

Additional verified Vulkan override command:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-vulkan
./build/visual_math_vulkan --frames=1 --scene-scale=1.0 --scene-rotation=45 --scene-accent=0.5 --clear-blue=0.25
```

Result: the executable accepted CLI scene overrides, reported the configured scene in startup output, rendered one frame, and exited cleanly.

Latest verified OpenGL result:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-opengl
cmake --preset=vcpkg
cmake --build --preset=vcpkg
ctest --preset=vcpkg
```

Result: native configure and build passed, shader assets were copied into `build/shaders`, and `ctest --preset=vcpkg` passed with `17` tests.

Additional verified OpenGL renderer command:

```bash
cd /Users/Artsem_Nikitsenka/visual-math/visual-math-opengl
./build/visual_math_opengl --scene-kind=constellation --frames=1 --animation-speed=45 --material-pulse-speed=2.5 --material-pulse-intensity=0.4 --material-palette-bias=0.65 --material-alpha-floor=0.78 --material-luminance-response=0.3 --scene-accent=0.6
```

Result: the executable accepted Phase 8 scene overrides plus `--scene-kind=constellation`, loaded GLSL shader assets from `build/shaders`, created the OpenGL context, rendered one animated frame for the second OpenGL scene family, printed startup summary plus runtime stats, and exited cleanly.
