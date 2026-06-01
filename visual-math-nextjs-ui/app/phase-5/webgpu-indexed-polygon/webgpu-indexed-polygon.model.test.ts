import {
  DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
  indexedPolygonArea,
  indexedPolygonClearColor,
  indexedPolygonIndexCount,
  indexedPolygonPeakColor,
  indexedPolygonVertexCount,
  isWebGpuIndexedPolygonScene,
  webGpuIndexedPolygonSummary,
} from "./webgpu-indexed-polygon.model"

describe("webgpu-indexed-polygon.model", () => {
  it("recognizes a valid indexed polygon scene", () => {
    expect(isWebGpuIndexedPolygonScene(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(true)
    expect(isWebGpuIndexedPolygonScene({ red: 0.2 })).toBe(false)
  })

  it("formats derived indexed polygon values", () => {
    expect(indexedPolygonClearColor(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(indexedPolygonPeakColor(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(192, 167, 148, 1.00)",
    )
    expect(indexedPolygonVertexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(7)
    expect(indexedPolygonIndexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe(18)
    expect(indexedPolygonArea(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)).toBe("1.20 clip-space units")
  })

  it("summarizes the indexed polygon route", () => {
    expect(
      webGpuIndexedPolygonSummary(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE, "Ready", "bgra8unorm"),
    ).toContain("18 indices targeting bgra8unorm")
  })
})
