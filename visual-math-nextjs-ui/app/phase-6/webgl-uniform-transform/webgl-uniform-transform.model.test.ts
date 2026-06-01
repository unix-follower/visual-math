import {
  DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE,
  isWebGlUniformTransformScene,
  webGlUniformTransformArea,
  webGlUniformTransformClearColor,
  webGlUniformTransformPeakColor,
  webGlUniformTransformSummary,
  webGlUniformTransformTranslation,
} from "./webgl-uniform-transform.model"

describe("webgl-uniform-transform.model", () => {
  it("recognizes a valid uniform transform scene", () => {
    expect(isWebGlUniformTransformScene(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(true)
    expect(isWebGlUniformTransformScene({ red: 0.1 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(webGlUniformTransformClearColor(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(webGlUniformTransformPeakColor(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgb(70, 73, 68)",
    )
    expect(webGlUniformTransformArea(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe("0.48 units^2")
    expect(webGlUniformTransformTranslation(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE)).toBe(
      "(0.06, -0.04)",
    )
  })

  it("summarizes the third Phase 6 route", () => {
    expect(
      webGlUniformTransformSummary(DEFAULT_WEBGL_UNIFORM_TRANSFORM_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL uniform transform is ready")
  })
})
