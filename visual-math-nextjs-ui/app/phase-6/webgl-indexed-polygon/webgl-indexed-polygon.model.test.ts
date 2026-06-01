import {
  DEFAULT_WEBGL_INDEXED_POLYGON_SCENE,
  isWebGlIndexedPolygonScene,
  webGlIndexedPolygonArea,
  webGlIndexedPolygonClearColor,
  webGlIndexedPolygonIndexCount,
  webGlIndexedPolygonPeakColor,
  webGlIndexedPolygonSummary,
  webGlIndexedPolygonVertexCount,
} from "./webgl-indexed-polygon.model"

describe("webgl-indexed-polygon.model", () => {
  it("recognizes a valid indexed polygon scene", () => {
    expect(isWebGlIndexedPolygonScene(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)).toBe(true)
    expect(isWebGlIndexedPolygonScene({ red: 0.1 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(webGlIndexedPolygonClearColor(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(webGlIndexedPolygonPeakColor(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)).toBe(
      "rgb(78, 77, 79)",
    )
    expect(webGlIndexedPolygonVertexCount(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)).toBe(7)
    expect(webGlIndexedPolygonIndexCount(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)).toBe(18)
    expect(webGlIndexedPolygonArea(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)).toBe("1.20 units^2")
  })

  it("summarizes the fourth Phase 6 route", () => {
    expect(
      webGlIndexedPolygonSummary(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL indexed polygon is ready")
  })
})
