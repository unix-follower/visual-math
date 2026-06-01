import {
  averageApproximation,
  DEFAULT_LIMITS_LAB_SCENE,
  evaluateLimitsCurve,
  isLimitsLabScene,
  leftHandValue,
  limitValue,
  limitsLabSummary,
  rightHandValue,
} from "./limits-lab.model"

describe("limits-lab.model", () => {
  it("recognizes a valid limits scene", () => {
    expect(isLimitsLabScene(DEFAULT_LIMITS_LAB_SCENE)).toBe(true)
    expect(isLimitsLabScene({ targetX: 0 })).toBe(false)
  })

  it("models the removable discontinuity and limit estimates", () => {
    expect(evaluateLimitsCurve(DEFAULT_LIMITS_LAB_SCENE, 0)).toBeNull()
    expect(limitValue(DEFAULT_LIMITS_LAB_SCENE)).toBe(1)
    expect(leftHandValue(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(0.973546, 5)
    expect(rightHandValue(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(0.973546, 5)
    expect(averageApproximation(DEFAULT_LIMITS_LAB_SCENE)).toBeCloseTo(0.973546, 5)
  })

  it("summarizes the scene", () => {
    expect(limitsLabSummary(DEFAULT_LIMITS_LAB_SCENE)).toContain("As x approaches 0.00")
    expect(limitsLabSummary(DEFAULT_LIMITS_LAB_SCENE)).toContain(
      "removable-discontinuity limit is 1.000",
    )
  })
})
