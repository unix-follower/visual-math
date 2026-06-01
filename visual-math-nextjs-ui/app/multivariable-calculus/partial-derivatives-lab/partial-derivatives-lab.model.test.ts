import {
  DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE,
  evaluateSurface,
  gradientMagnitude,
  isPartialDerivativesLabScene,
  partialDerivativeX,
  partialDerivativeY,
  partialDerivativesLabSummary,
  sampleHeight,
} from "./partial-derivatives-lab.model"

describe("partial-derivatives-lab.model", () => {
  it("recognizes a valid multivariable scene", () => {
    expect(isPartialDerivativesLabScene(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toBe(true)
    expect(isPartialDerivativesLabScene({ sampleX: 1 })).toBe(false)
  })

  it("derives surface height and partial derivatives", () => {
    expect(evaluateSurface(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE, 1, -1)).toBeCloseTo(1.6, 5)
    expect(sampleHeight(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toBeCloseTo(1.6, 5)
    expect(partialDerivativeX(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE, 1, -1)).toBeCloseTo(1, 5)
    expect(partialDerivativeY(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE, 1, -1)).toBeCloseTo(-1, 5)
    expect(gradientMagnitude(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toBeCloseTo(1.414214, 5)
  })

  it("summarizes the multivariable scene", () => {
    expect(partialDerivativesLabSummary(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toContain(
      "At (1.00, -1.00), the surface height is 1.60",
    )
    expect(partialDerivativesLabSummary(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)).toContain(
      "∂f/∂x is 1.00",
    )
  })
})
