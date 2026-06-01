import {
  DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
  indirectIndexedPolygonArea,
  indirectIndexedPolygonClearColor,
  indirectIndexedPolygonEncodedIndexCount,
  indirectIndexedPolygonIndexCount,
  indirectIndexedPolygonPeakColor,
  indirectIndexedPolygonStageLabel,
  indirectIndexedPolygonVertexCount,
  isWebGpuIndirectIndexedPolygonScene,
  webGpuIndirectIndexedPolygonSummary,
} from "./webgpu-indirect-indexed-polygon.model"

describe("webgpu-indirect-indexed-polygon.model", () => {
  it("recognizes a valid indirect indexed polygon scene", () => {
    expect(isWebGpuIndirectIndexedPolygonScene(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      true,
    )
    expect(isWebGpuIndirectIndexedPolygonScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(indirectIndexedPolygonClearColor(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(13, 26, 46, 1.00)",
    )
    expect(indirectIndexedPolygonPeakColor(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(189, 174, 163, 1.00)",
    )
    expect(indirectIndexedPolygonVertexCount(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(8)
    expect(indirectIndexedPolygonIndexCount(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(21)
    expect(
      indirectIndexedPolygonEncodedIndexCount(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE),
    ).toBe(15)
    expect(indirectIndexedPolygonArea(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "1.19 clip-space units",
    )
    expect(indirectIndexedPolygonStageLabel(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)).toBe(
      "drawIndexedIndirect / 15 indices",
    )
  })

  it("summarizes the indirect indexed polygon route", () => {
    const summary = webGpuIndirectIndexedPolygonSummary(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU indirect indexed polygon is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
