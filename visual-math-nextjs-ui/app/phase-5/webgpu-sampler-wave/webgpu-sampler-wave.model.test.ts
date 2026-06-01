import {
  DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE,
  isWebGpuSamplerWaveScene,
  samplerWaveAccentColor,
  samplerWaveClearColor,
  samplerWaveFootprint,
  webGpuSamplerWaveSummary,
} from "./webgpu-sampler-wave.model"

describe("webgpu-sampler-wave.model", () => {
  it("recognizes a valid sampler wave scene", () => {
    expect(isWebGpuSamplerWaveScene(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe(true)
    expect(isWebGpuSamplerWaveScene({ red: 0.2 })).toBe(false)
  })

  it("formats the clear color and derived labels", () => {
    expect(samplerWaveClearColor(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe("rgba(15, 26, 56, 1.00)")
    expect(samplerWaveAccentColor(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe(
      "rgba(126, 112, 90, 1.00)",
    )
    expect(samplerWaveFootprint(DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE)).toBe("8x8 / filter linear")
  })

  it("summarizes the sampler wave route", () => {
    const summary = webGpuSamplerWaveSummary(
      DEFAULT_WEBGPU_SAMPLER_WAVE_SCENE,
      "Ready",
      "bgra8unorm",
    )

    expect(summary).toContain("WebGPU sampler wave is ready")
    expect(summary).toContain("bgra8unorm")
  })
})
