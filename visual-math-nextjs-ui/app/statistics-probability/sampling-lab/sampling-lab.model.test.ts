import {
  DEFAULT_SAMPLING_LAB_SCENE,
  isSamplingLabScene,
  samplingLabSummary,
  simulateSamplingLab,
  theoreticalMean,
} from "./sampling-lab.model"

describe("sampling-lab.model", () => {
  it("recognizes a valid sampling scene", () => {
    expect(isSamplingLabScene(DEFAULT_SAMPLING_LAB_SCENE)).toBe(true)
    expect(isSamplingLabScene({ successProbability: 0.5 })).toBe(false)
  })

  it("derives stable metrics from the seeded simulation", () => {
    const metrics = simulateSamplingLab(DEFAULT_SAMPLING_LAB_SCENE)

    expect(metrics.histogram).toHaveLength(11)
    expect(metrics.histogram.reduce((sum, count) => sum + count, 0)).toBe(60)
    expect(metrics.theoreticalMean).toBe(theoreticalMean(DEFAULT_SAMPLING_LAB_SCENE))
    expect(metrics.empiricalMean).toBeCloseTo(4.75, 5)
  })

  it("summarizes the sampling scene", () => {
    expect(samplingLabSummary(DEFAULT_SAMPLING_LAB_SCENE)).toContain(
      "Across 60 experiments of 10 Bernoulli trials",
    )
    expect(samplingLabSummary(DEFAULT_SAMPLING_LAB_SCENE)).toContain("expected value is 5.00")
  })
})
