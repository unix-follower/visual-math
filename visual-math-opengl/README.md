## Prerequisites

- Install the macOS OpenGL development prerequisites that ship with Xcode Command Line Tools
- Set `VCPKG_ROOT` so the CMake preset can resolve the vcpkg toolchain file

## Status

Phase 8 is complete. The OpenGL target now has a reusable native core library, a thin executable entry point, a port of the validated Phase 7 scene/config layer, CLI scene override parsing plus scene-kind selection, two GLFW-backed OpenGL scene families that share one renderer-configuration model, an externalized scene catalog, extracted renderer-configuration types in dedicated files, externalized GL resource helpers, externalized GL program helpers, checked-in GLSL shader assets, a generated shader-asset manifest shared by build and runtime code, externalized renderer program configuration, externalized pass-resource configuration, startup/runtime summary reporting, and headless GoogleTests for the pure scene, transform, geometry, parser helpers, and shader-loading path.

This Phase 8 milestone is complete. The OpenGL package now configures, builds, tests, accepts the same scene arguments used by the Vulkan baseline, creates a macOS-safe GLFW OpenGL context, loads checked-in GLSL shader assets from disk, compiles shaders, uploads scene geometry, drives the shared transform uniform from the scene model, shades indexed overlays through a dedicated pulse-tuned material path, renders one frame, and reports runtime stats cleanly across both the original `gradient-triangle` scene and the `constellation` scene. It also now has focused coverage for runtime shader-directory resolution and copied GLSL asset presence so packaging regressions fail fast, a generated shader-asset manifest so shader names and relative paths are no longer duplicated between CMake and runtime code, explicit renderer program plus draw-pass specifications so the OpenGL wiring is no longer hand-coded as ad hoc program switches, explicit geometry-resource specifications so VAO and buffer setup/teardown are no longer open-coded in `initialize()` and `cleanup()`, an extracted renderer configuration model that demonstrably supports more than one scene family, an externalized scene catalog so adding future scenes no longer requires extending `GLApp`'s inline scene-kind switch, extracted renderer-configuration types so future OpenGL features can depend on a shared data model instead of one implementation-local block, externalized GL resource helpers so geometry upload plus resource lifecycle work no longer share a file with renderer orchestration, and externalized GL program helpers so shader/program lifecycle work no longer shares a file with the app loop.

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

Latest verified result: native configure and build passed, shader assets were copied into `build/shaders`, and `ctest --preset=vcpkg` passed with `17` tests.

Constellation scene smoke command:

```bash
./build/visual_math_opengl --scene-kind=constellation --frames=1 --animation-speed=45 --material-pulse-speed=2.5 --material-pulse-intensity=0.4 --material-palette-bias=0.65 --material-alpha-floor=0.78 --material-luminance-response=0.3 --scene-accent=0.6
```

Latest verified result: the executable accepted the Phase 8 scene overrides plus `--scene-kind=constellation`, loaded GLSL shader assets from `build/shaders`, created the OpenGL context, rendered one animated frame for the second OpenGL scene family, printed startup summary plus runtime stats, and exited cleanly.

Supported scene flags are `--scene-kind=gradient-triangle|constellation`, `--scene-scale`, `--scene-rotation`, `--animation-speed`, `--material-pulse-speed`, `--material-pulse-intensity`, `--material-palette-bias`, `--material-alpha-floor`, `--material-luminance-response`, `--scene-accent`, `--clear-red`, `--clear-green`, `--clear-blue`, `--clear-alpha`, and `--frames`.

## Current Files

- `src/visual_math_opengl.cpp` keeps the executable entry point thin while applying validated launch options and printing startup/runtime summaries
- `src/gl_app.cpp` and `include/visual_math_opengl/gl_app.hpp` now hold the final Phase 8 runtime orchestration surface for GLFW/context setup, summary reporting, the app loop, and runtime stats
- `src/scene_catalog.cpp` and `include/visual_math_opengl/scene_catalog.hpp` now own the scene-kind catalog that maps each OpenGL scene family to its reusable geometry builders outside `GLApp`
- `src/renderer_configuration.cpp` and `include/visual_math_opengl/renderer_configuration.hpp` now own the reusable renderer-configuration data model, including program specs, draw-pass specs, geometry specs, and scene-to-config assembly
- `src/gl_resource_helpers.cpp` and `include/visual_math_opengl/gl_resource_helpers.hpp` now own geometry upload plus buffer/VAO lifecycle helpers outside `GLApp`
- `src/gl_program_helpers.cpp` and `include/visual_math_opengl/gl_program_helpers.hpp` now own shader loading, compile/link, uniform discovery, uniform binding, and renderer-program teardown outside `GLApp`
- `shaders/gradient_triangle.vert`, `shaders/gradient_triangle.frag`, and `shaders/indexed_polygon.frag` define the checked-in GLSL assets copied into `build/shaders` for runtime loading
- `cmake/shader_assets.hpp.in` generates the canonical shader-asset manifest consumed by the OpenGL runtime so packaging metadata stays centralized in CMake
- `src/gradient_triangle_scene.cpp` and `include/visual_math_opengl/gradient_triangle_scene.hpp` define the reusable scene model, scene-kind labels, transform/material helpers, and geometry builders for both OpenGL scene families
- `src/launch_options.cpp` and `include/visual_math_opengl/launch_options.hpp` parse CLI frame, scene-kind, and scene override inputs into the native OpenGL scene model
- `test/visual_math_opengl_test.cpp` contains headless GoogleTests for scene math, geometry across both scene kinds, launch parsing including invalid scene-kind rejection, startup/runtime summaries, shader-directory resolution, copied GLSL shader-asset presence, the scene-catalog surface, the renderer-configuration surface, the GL resource-helper surface, and the GL program-helper surface

## Phase 8 Result

Phase 8 is complete for the native OpenGL target.
