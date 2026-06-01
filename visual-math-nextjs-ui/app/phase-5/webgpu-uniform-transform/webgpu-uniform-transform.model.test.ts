import {
  DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
  isWebGpuUniformTransformScene,
  uniformTransformArea,
  uniformTransformClearColor,
  uniformTransformPeakColor,
  webGpuUniformTransformSummary,
} from "./webgpu-uniform-transform.model"

describe("webgpu-uniform-transform.model", () => {
  it("recognizes a valid uniform transform scene", () => {
    expect(isWebGpuUniformTransformScene(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(true)
    expect(isWebGpuUniformTransformScene({ red: 0.2 })).toBe(false)
  })

  it("formats the derived uniform transform metrics", () => {
    expect(uniformTransformClearColor(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgba(15, 26, 51, 1.00)",
    )
    expect(uniformTransformPeakColor(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(
      "rgba(181, 139, 154, 1.00)",
    )
    expect(uniformTransformArea(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)).toBe(
      "0.88 clip-space units",
    )
  })

  it("summarizes the uniform-buffer route", () => {
    expect(
      webGpuUniformTransformSummary(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE, "Ready", "bgra8unorm"),
    ).toContain("uniform buffer targeting bgra8unorm")
  })
})
