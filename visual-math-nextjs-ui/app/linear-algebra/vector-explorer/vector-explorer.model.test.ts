import {
  DEFAULT_VECTOR_SCENE,
  isVectorScene,
  vectorAngleDegrees,
  vectorMagnitude,
  vectorQuadrantLabel,
  vectorSummary,
} from "./vector-explorer.model"

describe("vector-explorer.model", () => {
  it("recognizes a valid vector scene", () => {
    expect(isVectorScene(DEFAULT_VECTOR_SCENE)).toBe(true)
    expect(isVectorScene({ vector: { x: 2 } })).toBe(false)
  })

  it("calculates vector magnitude, angle, and quadrant", () => {
    expect(vectorMagnitude(DEFAULT_VECTOR_SCENE.vector)).toBeCloseTo(3.605551, 5)
    expect(vectorAngleDegrees(DEFAULT_VECTOR_SCENE.vector)).toBeCloseTo(33.690067, 5)
    expect(vectorQuadrantLabel(DEFAULT_VECTOR_SCENE.vector)).toBe("Quadrant I")
  })

  it("summarizes the vector scene", () => {
    expect(vectorSummary(DEFAULT_VECTOR_SCENE.vector)).toContain(
      "Vector (3.0, 2.0) has magnitude 3.61",
    )
    expect(vectorSummary(DEFAULT_VECTOR_SCENE.vector)).toContain("Quadrant I")
  })
})
