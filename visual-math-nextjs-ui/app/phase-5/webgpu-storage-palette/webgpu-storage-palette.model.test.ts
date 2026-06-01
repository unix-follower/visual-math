import {
  DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
  isWebGpuStoragePaletteScene,
  storagePaletteClearColor,
  storagePalettePeakColor,
  storagePaletteSpread,
  webGpuStoragePaletteSummary,
} from "./webgpu-storage-palette.model"

describe("webgpu-storage-palette.model", () => {
  it("recognizes a valid storage palette scene", () => {
    expect(isWebGpuStoragePaletteScene(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe(true)
    expect(isWebGpuStoragePaletteScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(storagePaletteClearColor(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe(
      "rgba(13, 26, 46, 1.00)",
    )
    expect(storagePalettePeakColor(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe(
      "rgba(159, 123, 139, 1.00)",
    )
    expect(storagePaletteSpread(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)).toBe("1.10 palette units")
  })

  it("summarizes the storage palette route", () => {
    const summary = webGpuStoragePaletteSummary(
      DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU storage palette is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
