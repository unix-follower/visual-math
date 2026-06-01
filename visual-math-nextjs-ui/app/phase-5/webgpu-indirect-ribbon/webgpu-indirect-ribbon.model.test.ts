import {
  DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
  indirectRibbonAccentColor,
  indirectRibbonClearColor,
  indirectRibbonStageLabel,
  isWebGpuIndirectRibbonScene,
  webGpuIndirectRibbonSummary,
} from "./webgpu-indirect-ribbon.model"

describe("webgpu-indirect-ribbon.model", () => {
  it("recognizes a valid indirect ribbon scene", () => {
    expect(isWebGpuIndirectRibbonScene(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(true)
    expect(isWebGpuIndirectRibbonScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(indirectRibbonClearColor(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(
      "rgba(13, 26, 46, 1.00)",
    )
    expect(indirectRibbonAccentColor(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(
      "rgba(113, 94, 88, 1.00)",
    )
    expect(indirectRibbonStageLabel(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)).toBe(
      "Indirect draw / echoes 2",
    )
  })

  it("summarizes the indirect ribbon route", () => {
    const summary = webGpuIndirectRibbonSummary(
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU indirect ribbon is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
