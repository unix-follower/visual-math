import {
  DEFAULT_WEBGL_TEXTURE_GRID_SCENE,
  isWebGlTextureGridScene,
  webGlTextureGridAccentColor,
  webGlTextureGridClearColor,
  webGlTextureGridDensity,
  webGlTextureGridSummary,
} from "./webgl-texture-grid.model"

describe("webgl-texture-grid.model", () => {
  it("recognizes a valid texture-grid scene", () => {
    expect(isWebGlTextureGridScene(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe(true)
    expect(isWebGlTextureGridScene({ red: 0.1 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(webGlTextureGridClearColor(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe(
      "rgba(20, 26, 56, 1.00)",
    )
    expect(webGlTextureGridAccentColor(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe("rgb(89, 90, 92)")
    expect(webGlTextureGridDensity(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)).toBe("12 texels / row")
  })

  it("summarizes the fifth Phase 6 route", () => {
    expect(webGlTextureGridSummary(DEFAULT_WEBGL_TEXTURE_GRID_SCENE, "Ready", "webgl2")).toContain(
      "WebGL texture grid is ready",
    )
  })
})
