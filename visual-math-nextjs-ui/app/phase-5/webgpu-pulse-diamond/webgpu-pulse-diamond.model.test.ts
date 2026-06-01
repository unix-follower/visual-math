import {
  DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE,
  isWebGpuPulseDiamondScene,
  pulseDiamondArea,
  pulseDiamondClearColor,
  pulseDiamondPeakColor,
  pulseDiamondScale,
  webGpuPulseDiamondSummary,
} from "./webgpu-pulse-diamond.model"

describe("webgpu-pulse-diamond.model", () => {
  it("recognizes a valid pulse diamond scene", () => {
    expect(isWebGpuPulseDiamondScene(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)).toBe(true)
    expect(isWebGpuPulseDiamondScene({ red: 0.2 })).toBe(false)
  })

  it("formats the derived pulse metrics", () => {
    expect(pulseDiamondClearColor(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)).toBe(
      "rgba(13, 20, 46, 1.00)",
    )
    expect(pulseDiamondPeakColor(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE)).toBe(
      "rgba(193, 150, 159, 1.00)",
    )
    expect(pulseDiamondScale(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, 0.25)).toBe(0.72)
    expect(pulseDiamondArea(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, 0.25)).toBe("0.72 clip-space units")
  })

  it("summarizes the animated route", () => {
    expect(
      webGpuPulseDiamondSummary(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, "Ready", 0.25, "bgra8unorm"),
    ).toContain("current phase 0.25")
  })
})
