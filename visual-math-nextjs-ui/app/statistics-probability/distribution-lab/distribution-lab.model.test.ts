import {
  binomialCoefficient,
  binomialProbability,
  clampHighlightedOutcome,
  DEFAULT_DISTRIBUTION_LAB_SCENE,
  distributionLabMetrics,
  distributionLabSummary,
  isDistributionLabScene,
} from "./distribution-lab.model"

describe("distribution-lab.model", () => {
  it("recognizes a valid distribution scene", () => {
    expect(isDistributionLabScene(DEFAULT_DISTRIBUTION_LAB_SCENE)).toBe(true)
    expect(isDistributionLabScene({ trialCount: 8 })).toBe(false)
  })

  it("derives binomial probabilities and clamps outcomes", () => {
    expect(binomialCoefficient(8, 4)).toBe(70)
    expect(binomialProbability(8, 0.45, 4)).toBeCloseTo(0.262663, 5)
    expect(clampHighlightedOutcome(11, 8)).toBe(8)

    const metrics = distributionLabMetrics(DEFAULT_DISTRIBUTION_LAB_SCENE)
    expect(metrics.highlightedProbability).toBeCloseTo(0.262663, 5)
    expect(metrics.cumulativeProbability).toBeCloseTo(0.739619, 5)
    expect(metrics.expectedValue).toBeCloseTo(3.6, 5)
    expect(metrics.variance).toBeCloseTo(1.98, 5)
  })

  it("summarizes the distribution scene", () => {
    expect(distributionLabSummary(DEFAULT_DISTRIBUTION_LAB_SCENE)).toContain(
      "For 8 Bernoulli trials at success probability 0.45",
    )
    expect(distributionLabSummary(DEFAULT_DISTRIBUTION_LAB_SCENE)).toContain("P(X = 4) is 0.263")
  })
})
