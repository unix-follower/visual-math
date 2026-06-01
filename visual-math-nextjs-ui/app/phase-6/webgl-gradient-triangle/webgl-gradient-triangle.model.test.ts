import {
  DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
  isWebGlGradientTriangleScene,
  webGlGradientTriangleArea,
  webGlGradientTriangleClearColor,
  webGlGradientTrianglePeakColor,
  webGlGradientTriangleSummary,
} from "./webgl-gradient-triangle.model"

describe("webgl-gradient-triangle.model", () => {
  it("recognizes a valid gradient triangle scene", () => {
    expect(isWebGlGradientTriangleScene(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe(true)
    expect(isWebGlGradientTriangleScene({ red: 0.1 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(webGlGradientTriangleClearColor(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe(
      "rgba(20, 31, 46, 1.00)",
    )
    expect(webGlGradientTriangleArea(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe("0.49 units^2")
    expect(webGlGradientTrianglePeakColor(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)).toBe(
      "rgb(104, 74, 66)",
    )
  })

  it("summarizes the second Phase 6 route", () => {
    expect(
      webGlGradientTriangleSummary(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL gradient triangle is ready")
  })
})
