import {
  DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
  instancedLatticeAccentColor,
  instancedLatticeClearColor,
  instancedLatticeStageLabel,
  isWebGpuInstancedLatticeScene,
  webGpuInstancedLatticeSummary,
} from "./webgpu-instanced-lattice.model"

describe("webgpu-instanced-lattice.model", () => {
  it("recognizes a valid instanced lattice scene", () => {
    expect(isWebGpuInstancedLatticeScene(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)).toBe(true)
    expect(isWebGpuInstancedLatticeScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(instancedLatticeClearColor(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)).toBe(
      "rgba(15, 26, 46, 1.00)",
    )
    expect(instancedLatticeAccentColor(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)).toBe(
      "rgba(117, 96, 88, 1.00)",
    )
    expect(instancedLatticeStageLabel()).toBe("1 mesh / 5 instances")
  })

  it("summarizes the instanced route", () => {
    const summary = webGpuInstancedLatticeSummary(
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU instanced lattice is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
