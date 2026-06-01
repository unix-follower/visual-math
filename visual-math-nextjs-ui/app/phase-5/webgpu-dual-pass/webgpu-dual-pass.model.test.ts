import {
  DEFAULT_WEBGPU_DUAL_PASS_SCENE,
  dualPassAccentColor,
  dualPassClearColor,
  dualPassStageLabel,
  isWebGpuDualPassScene,
  webGpuDualPassSummary,
} from "./webgpu-dual-pass.model"

describe("webgpu-dual-pass.model", () => {
  it("recognizes a valid dual-pass scene", () => {
    expect(isWebGpuDualPassScene(DEFAULT_WEBGPU_DUAL_PASS_SCENE)).toBe(true)
    expect(isWebGpuDualPassScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(dualPassClearColor(DEFAULT_WEBGPU_DUAL_PASS_SCENE)).toBe("rgba(15, 26, 51, 1.00)")
    expect(dualPassAccentColor(DEFAULT_WEBGPU_DUAL_PASS_SCENE)).toBe("rgba(136, 103, 86, 1.00)")
    expect(dualPassStageLabel(DEFAULT_WEBGPU_DUAL_PASS_SCENE)).toBe("2 passes / mix 0.58")
  })

  it("summarizes the dual-pass route", () => {
    const summary = webGpuDualPassSummary(DEFAULT_WEBGPU_DUAL_PASS_SCENE, "Ready", "bgra8unorm")

    expect(summary).toContain("WebGPU dual pass is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
