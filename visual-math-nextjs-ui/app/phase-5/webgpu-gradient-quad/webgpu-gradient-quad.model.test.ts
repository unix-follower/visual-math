import {
  DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
  gradientQuadArea,
  gradientQuadClearColor,
  gradientQuadPeakColor,
  isWebGpuGradientQuadScene,
  webGpuGradientQuadSummary,
} from "./webgpu-gradient-quad.model"

describe("webgpu-gradient-quad.model", () => {
  it("recognizes a valid gradient quad scene", () => {
    expect(isWebGpuGradientQuadScene(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe(true)
    expect(isWebGpuGradientQuadScene({ red: 0.1 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(gradientQuadClearColor(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe(
      "rgba(20, 36, 56, 1.00)",
    )
    expect(gradientQuadArea(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe("2.43 clip-space units")
    expect(gradientQuadPeakColor(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)).toBe(
      "rgba(196, 158, 153, 1.00)",
    )
  })

  it("summarizes the second Phase 5 route", () => {
    expect(
      webGpuGradientQuadSummary(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE, "Ready", "bgra8unorm"),
    ).toContain("WebGPU gradient quad is ready")
  })
})
