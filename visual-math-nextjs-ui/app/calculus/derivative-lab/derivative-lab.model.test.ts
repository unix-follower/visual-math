import {
  DEFAULT_DERIVATIVE_LAB_SCENE,
  derivativeAt,
  derivativeLabSummary,
  evaluateDerivativeLabCurve,
  isDerivativeLabScene,
  secantSlope,
  tangentPoint,
} from "./derivative-lab.model"

describe("derivative-lab.model", () => {
  it("recognizes a valid derivative scene", () => {
    expect(isDerivativeLabScene(DEFAULT_DERIVATIVE_LAB_SCENE)).toBe(true)
    expect(isDerivativeLabScene({ pointX: 1, curvature: 0.5 })).toBe(false)
  })

  it("evaluates the curve and slopes", () => {
    expect(evaluateDerivativeLabCurve(DEFAULT_DERIVATIVE_LAB_SCENE, 1.5)).toBeCloseTo(0.05, 6)
    expect(derivativeAt(DEFAULT_DERIVATIVE_LAB_SCENE, 1.5)).toBeCloseTo(1.9, 6)
    expect(secantSlope(DEFAULT_DERIVATIVE_LAB_SCENE, 1.5)).toBeCloseTo(2.7, 6)
  })

  it("finds the tangent point and summarizes the scene", () => {
    expect(tangentPoint(DEFAULT_DERIVATIVE_LAB_SCENE)).toEqual({
      x: 1.5,
      y: expect.closeTo(0.05, 6),
    })
    expect(derivativeLabSummary(DEFAULT_DERIVATIVE_LAB_SCENE)).toContain("tangent slope is 1.90")
    expect(derivativeLabSummary(DEFAULT_DERIVATIVE_LAB_SCENE)).toContain(
      "secant slope one unit to the right is 2.70",
    )
  })
})
