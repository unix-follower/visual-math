import {
  computeRippleAccentColor,
  computeRippleClearColor,
  computeRippleStageLabel,
  DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
  isWebGpuComputeRippleScene,
  webGpuComputeRippleSummary,
} from "./webgpu-compute-ripple.model"

describe("webgpu-compute-ripple.model", () => {
  it("recognizes a valid compute ripple scene", () => {
    expect(isWebGpuComputeRippleScene(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(true)
    expect(isWebGpuComputeRippleScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(computeRippleClearColor(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(
      "rgba(18, 26, 46, 1.00)",
    )
    expect(computeRippleAccentColor(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(
      "rgba(122, 107, 77, 1.00)",
    )
    expect(computeRippleStageLabel(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)).toBe(
      "Compute + render / drift 0.34",
    )
  })

  it("summarizes the compute ripple route", () => {
    const summary = webGpuComputeRippleSummary(
      DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU compute ripple is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
