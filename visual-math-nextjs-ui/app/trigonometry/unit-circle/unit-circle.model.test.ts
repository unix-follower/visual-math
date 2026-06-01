import {
  angleRadians,
  DEFAULT_UNIT_CIRCLE_SCENE,
  isUnitCircleScene,
  normalizedAngleDegrees,
  tangentValue,
  unitCircleCoordinates,
  unitCircleSummary,
} from "./unit-circle.model"

describe("unit-circle.model", () => {
  it("recognizes a valid unit-circle scene", () => {
    expect(isUnitCircleScene(DEFAULT_UNIT_CIRCLE_SCENE)).toBe(true)
    expect(isUnitCircleScene({ angleDegrees: 45, showProjection: true })).toBe(false)
  })

  it("derives angle and coordinates", () => {
    expect(angleRadians(DEFAULT_UNIT_CIRCLE_SCENE)).toBeCloseTo(Math.PI / 4, 6)
    expect(unitCircleCoordinates(DEFAULT_UNIT_CIRCLE_SCENE)).toEqual({
      x: expect.closeTo(Math.SQRT1_2, 6),
      y: expect.closeTo(Math.SQRT1_2, 6),
    })
    expect(tangentValue(DEFAULT_UNIT_CIRCLE_SCENE)).toBeCloseTo(1, 6)
  })

  it("normalizes angle and summarizes the scene", () => {
    expect(
      normalizedAngleDegrees({
        ...DEFAULT_UNIT_CIRCLE_SCENE,
        angleDegrees: 225,
      }),
    ).toBe(-135)
    expect(unitCircleSummary(DEFAULT_UNIT_CIRCLE_SCENE)).toContain("cosine 0.707")
    expect(unitCircleSummary(DEFAULT_UNIT_CIRCLE_SCENE)).toContain("sine 0.707")
  })
})
