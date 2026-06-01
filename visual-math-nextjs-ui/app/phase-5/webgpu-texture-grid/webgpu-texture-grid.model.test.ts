import {
  DEFAULT_WEBGPU_TEXTURE_GRID_SCENE,
  isWebGpuTextureGridScene,
  textureGridAccentColor,
  textureGridClearColor,
  textureGridDensity,
  webGpuTextureGridSummary,
} from "./webgpu-texture-grid.model"

describe("webgpu-texture-grid.model", () => {
  it("recognizes a valid texture grid scene", () => {
    expect(isWebGpuTextureGridScene(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe(true)
    expect(isWebGpuTextureGridScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(textureGridClearColor(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe("rgba(20, 26, 56, 1.00)")
    expect(textureGridAccentColor(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe(
      "rgba(157, 109, 95, 1.00)",
    )
    expect(textureGridDensity(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)).toBe("4x4 / phase 3")
  })

  it("summarizes the texture grid route", () => {
    const summary = webGpuTextureGridSummary(
      DEFAULT_WEBGPU_TEXTURE_GRID_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU texture grid is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
