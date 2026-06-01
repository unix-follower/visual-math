import { render, screen } from "@testing-library/react"

import Home from "./page"

describe("Next.js home page", () => {
  it("links to the live Canvas and WebGPU routes", () => {
    render(<Home />)

    expect(screen.getByRole("heading", { name: "Visual Math Next.js Canvas" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open WebGL Multi-Obstacle Flow" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-multi-obstacle-flow",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Interactive Dye" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-interactive-dye",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Velocity Field" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-velocity-field",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Temporal Feedback" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-temporal-feedback",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Feedback Trails" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-feedback-trails",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Ping-Pong Feedback" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-ping-pong-feedback",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Bloom Blur" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-bloom-blur",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Dual Pass" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-dual-pass",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Textured Material" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-textured-material",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Shadow Relief" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-shadow-relief",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Lit Material" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-lit-material",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Depth Prism" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-depth-prism",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Perspective Camera" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-perspective-camera",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Texture Grid" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-texture-grid",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Indexed Polygon" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-indexed-polygon",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Uniform Transform" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-uniform-transform",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Gradient Triangle" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-gradient-triangle",
    )
    expect(screen.getByRole("link", { name: "Open WebGL Foundation" })).toHaveAttribute(
      "href",
      "/phase-6/webgl-foundation",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Compute Ripple" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-compute-ripple",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Dual Pass" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-dual-pass",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Sampler Wave" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-sampler-wave",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Texture Grid" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-texture-grid",
    )
    expect(
      screen.getByRole("link", {
        name: "Open WebGPU Indirect Indexed Polygon",
      }),
    ).toHaveAttribute("href", "/phase-5/webgpu-indirect-indexed-polygon")
    expect(screen.getByRole("link", { name: "Open WebGPU Indirect Ribbon" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-indirect-ribbon",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Storage Palette" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-storage-palette",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Instanced Lattice" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-instanced-lattice",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Pulse Diamond" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-pulse-diamond",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Uniform Transform" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-uniform-transform",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Indexed Polygon" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-indexed-polygon",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Gradient Quad" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-gradient-quad",
    )
    expect(screen.getByRole("link", { name: "Open WebGPU Foundation" })).toHaveAttribute(
      "href",
      "/phase-5/webgpu-foundation",
    )
    expect(screen.getByRole("heading", { name: "Phases 4 and 5 complete" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "WebGL started" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Graph Traversal Lab" })).toHaveAttribute(
      "href",
      "/discrete-math/graph-traversal-lab",
    )
    expect(screen.getByRole("link", { name: "Open Partial Derivatives Lab" })).toHaveAttribute(
      "href",
      "/multivariable-calculus/partial-derivatives-lab",
    )
    expect(screen.getByRole("link", { name: "Open Distribution Lab" })).toHaveAttribute(
      "href",
      "/statistics-probability/distribution-lab",
    )
    expect(screen.getByRole("link", { name: "Open Limits Lab" })).toHaveAttribute(
      "href",
      "/calculus/limits-lab",
    )
    expect(screen.getByRole("link", { name: "Open Integral Lab" })).toHaveAttribute(
      "href",
      "/calculus/integral-lab",
    )
    expect(screen.getByRole("link", { name: "Open Sampling Lab" })).toHaveAttribute(
      "href",
      "/statistics-probability/sampling-lab",
    )
    expect(screen.getByRole("link", { name: "Open Vector Explorer" })).toHaveAttribute(
      "href",
      "/linear-algebra/vector-explorer",
    )
    expect(screen.getByRole("link", { name: "Open Quadratic Plotter" })).toHaveAttribute(
      "href",
      "/algebra/quadratic-plotter",
    )
    expect(screen.getByRole("link", { name: "Open Unit Circle" })).toHaveAttribute(
      "href",
      "/trigonometry/unit-circle",
    )
    expect(screen.getByRole("link", { name: "Open Triangle Explorer" })).toHaveAttribute(
      "href",
      "/geometry/triangle-explorer",
    )
    expect(screen.getByRole("link", { name: "Open Derivative Lab" })).toHaveAttribute(
      "href",
      "/calculus/derivative-lab",
    )
  })
})
