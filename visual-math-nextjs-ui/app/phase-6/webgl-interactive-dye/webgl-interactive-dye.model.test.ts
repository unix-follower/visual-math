import {
  DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE,
  isWebGlInteractiveDyeScene,
  webGlInteractiveDyeClearColor,
  webGlInteractiveDyeFlowLabel,
  webGlInteractiveDyeInjectionLabel,
  webGlInteractiveDyeObstacleLabel,
  webGlInteractiveDyeSummary,
} from "./webgl-interactive-dye.model"

describe("webgl-interactive-dye.model", () => {
  it("recognizes a valid interactive-dye scene", () => {
    expect(isWebGlInteractiveDyeScene(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(true)
    expect(isWebGlInteractiveDyeScene({ speed: 1 })).toBe(false)
  })

  it("formats the derived labels", () => {
    expect(webGlInteractiveDyeClearColor(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "rgba(8, 13, 20, 1.00)",
    )
    expect(webGlInteractiveDyeInjectionLabel(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "0.28, 0.62 at 0.78",
    )
    expect(webGlInteractiveDyeObstacleLabel(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "0.68, 0.42 radius 0.16",
    )
    expect(webGlInteractiveDyeFlowLabel(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "swirl 0.54, retention 0.62, mix 0.68",
    )
  })

  it("summarizes the route", () => {
    expect(
      webGlInteractiveDyeSummary(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL interactive dye is ready")
  })
})
import {
  DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE,
  isWebGlInteractiveDyeScene,
  webGlInteractiveDyeClearColor,
  webGlInteractiveDyeFlowLabel,
  webGlInteractiveDyeInjectionLabel,
  webGlInteractiveDyeObstacleLabel,
  webGlInteractiveDyeSummary,
} from "./webgl-interactive-dye.model"

describe("webgl-interactive-dye.model", () => {
  it("recognizes a valid interactive-dye scene", () => {
    expect(isWebGlInteractiveDyeScene(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(true)
    expect(isWebGlInteractiveDyeScene({ speed: 1 })).toBe(false)
  })

  it("formats the derived labels", () => {
    expect(webGlInteractiveDyeClearColor(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "rgba(8, 13, 20, 1.00)",
    )
    expect(webGlInteractiveDyeInjectionLabel(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "0.28, 0.62 at 0.78",
    )
    expect(webGlInteractiveDyeObstacleLabel(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "0.68, 0.42 radius 0.16",
    )
    expect(webGlInteractiveDyeFlowLabel(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE)).toBe(
      "swirl 0.54, retention 0.62, mix 0.68",
    )
  })

  it("summarizes the route", () => {
    expect(
      webGlInteractiveDyeSummary(DEFAULT_WEBGL_INTERACTIVE_DYE_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL interactive dye is ready")
  })
})
