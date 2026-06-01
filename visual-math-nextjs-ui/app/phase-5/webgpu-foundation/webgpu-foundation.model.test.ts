import {
  DEFAULT_WEBGPU_FOUNDATION_SCENE,
  formatClearColor,
  isWebGpuFoundationScene,
  triangleAreaEstimate,
  triangleColorLabel,
  webGpuFoundationSummary,
} from "./webgpu-foundation.model"

describe("webgpu-foundation.model", () => {
  it("recognizes a valid WebGPU foundation scene", () => {
    expect(isWebGpuFoundationScene(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe(true)
    expect(isWebGpuFoundationScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(formatClearColor(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe("rgba(36, 59, 99, 1.00)")
    expect(triangleAreaEstimate(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe("0.16 viewport units")
    expect(triangleColorLabel(DEFAULT_WEBGPU_FOUNDATION_SCENE)).toBe("rgba(173, 166, 139, 1.00)")
  })

  it("summarizes the first Phase 5 route", () => {
    expect(
      webGpuFoundationSummary(DEFAULT_WEBGPU_FOUNDATION_SCENE, "Ready", "bgra8unorm"),
    ).toContain("WebGPU foundation is ready")
    expect(
      webGpuFoundationSummary(DEFAULT_WEBGPU_FOUNDATION_SCENE, "Ready", "bgra8unorm"),
    ).toContain("bgra8unorm")
  })
})
