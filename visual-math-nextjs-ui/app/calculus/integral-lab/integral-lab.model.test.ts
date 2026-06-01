import {
  DEFAULT_INTEGRAL_LAB_SCENE,
  exactIntegralArea,
  integralLabSummary,
  isIntegralLabScene,
  leftRiemannSum,
  midpointRiemannSum,
} from "./integral-lab.model"

describe("integral-lab.model", () => {
  it("recognizes a valid integral scene", () => {
    expect(isIntegralLabScene(DEFAULT_INTEGRAL_LAB_SCENE)).toBe(true)
    expect(isIntegralLabScene({ upperBound: 4 })).toBe(false)
  })

  it("derives exact and approximate areas", () => {
    expect(exactIntegralArea(DEFAULT_INTEGRAL_LAB_SCENE)).toBeCloseTo(5.226477, 5)
    expect(midpointRiemannSum(DEFAULT_INTEGRAL_LAB_SCENE)).toBeCloseTo(5.236144, 5)
    expect(leftRiemannSum(DEFAULT_INTEGRAL_LAB_SCENE)).toBeCloseTo(5.372179, 5)
  })

  it("summarizes the integral scene", () => {
    expect(integralLabSummary(DEFAULT_INTEGRAL_LAB_SCENE)).toContain("From x = 0 to x = 4.50")
    expect(integralLabSummary(DEFAULT_INTEGRAL_LAB_SCENE)).toContain(
      "exact accumulated area is 5.23",
    )
  })
})
