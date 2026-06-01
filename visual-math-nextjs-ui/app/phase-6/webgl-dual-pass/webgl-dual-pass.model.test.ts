import {
  DEFAULT_WEBGL_DUAL_PASS_SCENE,
  isWebGlDualPassScene,
  webGlDualPassAccentColor,
  webGlDualPassClearColor,
  webGlDualPassStageLabel,
  webGlDualPassSummary,
} from "./webgl-dual-pass.model"

describe("webgl-dual-pass.model", () => {
  it("recognizes a valid dual-pass scene", () => {
    expect(isWebGlDualPassScene(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe(true)
    expect(isWebGlDualPassScene({ glow: 0.5 })).toBe(false)
  })

  it("formats the clear color and pass labels", () => {
    expect(webGlDualPassClearColor(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe("rgba(15, 26, 51, 1.00)")
    expect(webGlDualPassAccentColor(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe("rgb(88, 79, 83)")
    expect(webGlDualPassStageLabel(DEFAULT_WEBGL_DUAL_PASS_SCENE)).toBe(
      "Pass 1 skew 0.42, pass 2 mix 0.58",
    )
  })

  it("summarizes the dual-pass route", () => {
    expect(webGlDualPassSummary(DEFAULT_WEBGL_DUAL_PASS_SCENE, "Ready", "webgl2")).toContain(
      "WebGL dual pass is ready",
    )
  })
})
