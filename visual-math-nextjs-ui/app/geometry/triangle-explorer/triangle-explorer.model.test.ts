import {
  DEFAULT_TRIANGLE_SCENE,
  isTriangleScene,
  triangleArea,
  triangleCentroid,
  trianglePerimeter,
  triangleSideLengths,
  triangleSummary,
  triangleVertices,
} from "./triangle-explorer.model"

describe("triangle-explorer.model", () => {
  it("recognizes a valid triangle scene", () => {
    expect(isTriangleScene(DEFAULT_TRIANGLE_SCENE)).toBe(true)
    expect(isTriangleScene({ base: 4, height: 3 })).toBe(false)
  })

  it("derives triangle geometry metrics", () => {
    expect(triangleArea(DEFAULT_TRIANGLE_SCENE)).toBe(12)
    expect(triangleCentroid(DEFAULT_TRIANGLE_SCENE)).toEqual({
      x: expect.closeTo(0, 6),
      y: expect.closeTo(0, 6),
    })
    expect(triangleSideLengths(DEFAULT_TRIANGLE_SCENE)).toEqual([6, 5, 5])
    expect(trianglePerimeter(DEFAULT_TRIANGLE_SCENE)).toBe(16)
  })

  it("returns vertices and summary text", () => {
    expect(triangleVertices(DEFAULT_TRIANGLE_SCENE)).toEqual([
      { x: -3, y: -1.3333333333333333 },
      { x: 3, y: -1.3333333333333333 },
      { x: 0, y: 2.666666666666667 },
    ])
    expect(triangleSummary(DEFAULT_TRIANGLE_SCENE)).toContain("area 12.00")
    expect(triangleSummary(DEFAULT_TRIANGLE_SCENE)).toContain("centroid at (0.00, 0.00)")
  })
})
