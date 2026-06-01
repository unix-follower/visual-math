import {
  DEFAULT_WEBGL_DEPTH_PRISM_SCENE,
  isWebGlDepthPrismScene,
  webGlDepthPrismAccentColor,
  webGlDepthPrismCameraLabel,
  webGlDepthPrismClearColor,
  webGlDepthPrismOcclusionLabel,
  webGlDepthPrismSummary,
} from "./webgl-depth-prism.model"

describe("webgl-depth-prism.model", () => {
  it("recognizes a valid depth-prism scene", () => {
    expect(isWebGlDepthPrismScene(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)).toBe(true)
    expect(isWebGlDepthPrismScene({ yaw: 24 })).toBe(false)
  })

  it("formats clear color and derived labels", () => {
    expect(webGlDepthPrismClearColor(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)).toBe(
      "rgba(10, 15, 26, 1.00)",
    )
    expect(webGlDepthPrismAccentColor(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)).toBe("rgb(131, 169, 210)")
    expect(webGlDepthPrismCameraLabel(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)).toBe(
      "yaw 24°, pitch 18°, distance 4.4",
    )
    expect(webGlDepthPrismOcclusionLabel(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)).toBe(
      "lift 0.46, spread 0.58",
    )
  })

  it("summarizes the depth-prism route", () => {
    expect(webGlDepthPrismSummary(DEFAULT_WEBGL_DEPTH_PRISM_SCENE, "Ready", "webgl2")).toContain(
      "WebGL depth prism is ready",
    )
  })
})
