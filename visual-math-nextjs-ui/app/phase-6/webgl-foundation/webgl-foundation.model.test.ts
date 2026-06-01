import {
  DEFAULT_WEBGL_FOUNDATION_SCENE,
  formatWebGlClearColor,
  isWebGlFoundationScene,
  webGlFoundationChannelEnergy,
  webGlFoundationSummary,
} from "./webgl-foundation.model"

describe("webgl-foundation.model", () => {
  it("recognizes a valid WebGL foundation scene", () => {
    expect(isWebGlFoundationScene(DEFAULT_WEBGL_FOUNDATION_SCENE)).toBe(true)
    expect(isWebGlFoundationScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(formatWebGlClearColor(DEFAULT_WEBGL_FOUNDATION_SCENE)).toBe("rgba(23, 36, 56, 1.00)")
    expect(webGlFoundationChannelEnergy(DEFAULT_WEBGL_FOUNDATION_SCENE)).toBe("15%")
  })

  it("summarizes the first Phase 6 route", () => {
    const summary = webGlFoundationSummary(DEFAULT_WEBGL_FOUNDATION_SCENE, "Ready", "webgl2")

    expect(summary).toContain("WebGL foundation is ready")
    expect(summary).toContain("webgl2")
  })
})
