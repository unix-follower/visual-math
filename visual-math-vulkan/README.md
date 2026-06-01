## Prerequisites

- Install the [Vulkan SDK](https://vulkan.lunarg.com/sdk/home)
- Set `VCPKG_ROOT` so the CMake preset can resolve the vcpkg toolchain file

## Status

Phase 7 is complete. The Vulkan target now has a reusable native core library, a first gradient-triangle scene model inspired by the Angular WebGL gradient-triangle slice, a thin executable entry point, GLFW-backed window creation, Vulkan surface/device/swapchain bootstrap, build-time SPIR-V shader compilation, validation-layer toggles, resize-safe swapchain recreation, a time-varying uniform-driven transform path, two indexed polygon overlays sharing a dedicated material path with per-material pulse speed, intensity, palette-bias, alpha-floor, and luminance-response controls, per-run runtime stats reporting, an outline primitive layered onto the same renderer path, CLI-driven scene overrides, and headless GoogleTests for the pure native math/render-state helpers.

This completes the planned Phase 7 Vulkan bootstrap milestone. The package can configure, build, test, open a native window, initialize the draw/present path, render the gradient triangle plus two indexed overlays and an outline primitive, vary indexed materials through a dedicated fragment shader, animate both transform and indexed-material pulse state through the shared uniform path, tune material pulse amplitude, palette direction, overlay alpha floor, and luminance sensitivity from scene state, report per-run frame timing after execution, recreate swapchain resources on resize, and exit cleanly after a frame-limited smoke run.

## Build And Test

Run the canonical native validation flow:

```bash
./build.sh
```

That script performs:

```bash
vcpkg install
cmake --preset=vcpkg
cmake --build --preset=vcpkg
ctest --preset=vcpkg
```

Latest verified result: native configure and build passed, and `ctest --preset=vcpkg` passed with `11` tests.

One-frame smoke test:

```bash
./build/visual_math_vulkan --frames=1
```

Latest verified result: the executable opened the GLFW-backed Vulkan surface, initialized swapchain and pipeline resources, rendered one frame with the animated uniform-driven triangle plus two indexed overlays and the outline path, printed runtime stats for the completed run, and exited cleanly.

You can also override the first scene from the command line:

```bash
./build/visual_math_vulkan --frames=1 --scene-scale=1.0 --scene-rotation=45 --animation-speed=90 --material-pulse-speed=2.5 --material-pulse-intensity=0.4 --material-palette-bias=0.65 --material-alpha-floor=0.78 --material-luminance-response=0.3 --scene-accent=0.5 --clear-blue=0.25
```

Supported scene flags are `--scene-scale`, `--scene-rotation`, `--animation-speed`, `--material-pulse-speed`, `--material-pulse-intensity`, `--material-palette-bias`, `--material-alpha-floor`, `--material-luminance-response`, `--scene-accent`, `--clear-red`, `--clear-green`, `--clear-blue`, `--clear-alpha`, and `--frames`.

## Current Files

- `src/visual_math_vulkan.cpp` keeps the executable entry point thin while applying validated launch options and printing runtime stats after the renderer run completes
- `src/vulkan_app.cpp` and `include/visual_math_vulkan/vulkan_app.hpp` hold the current Phase 7 bootstrap surface, including validation toggles, window, surface, swapchain, render pass, animated transform plus material uniform updates, dual indexed-overlay and non-indexed draw paths, per-run runtime stats, a dedicated indexed material pipeline, command buffer, resize handling, and teardown flow
- `src/gradient_triangle_scene.cpp` and `include/visual_math_vulkan/gradient_triangle_scene.hpp` define the first reusable scene model, transform/material uniform builder, material tuning controls, and vertex/index-generation helpers for the triangle plus both indexed overlays
- `src/launch_options.cpp` and `include/visual_math_vulkan/launch_options.hpp` parse CLI frame and scene overrides into the native scene model
- `shaders/gradient_triangle.vert`, `shaders/gradient_triangle.frag`, and `shaders/indexed_polygon.frag` are compiled to SPIR-V during the build
- `test/visual_math_vulkan_test.cpp` contains the first headless GoogleTests

## Next Step

Phase 7 is complete. The next repository milestone is Phase 8 OpenGL parity, while any future Vulkan work can build on this verified native baseline rather than extending the bootstrap scope further.
