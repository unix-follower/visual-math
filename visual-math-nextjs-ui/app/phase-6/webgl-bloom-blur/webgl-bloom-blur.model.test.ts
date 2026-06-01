import {
  DEFAULT_WEBGL_BLOOM_BLUR_SCENE,
  isWebGlBloomBlurScene,
  webGlBloomBlurAccentColor,
  webGlBloomBlurClearColor,
  webGlBloomBlurStageLabel,
  webGlBloomBlurSummary,
} from "./webgl-bloom-blur.model"

describe("webgl-bloom-blur.model", () => {
  it("recognizes a valid bloom-blur scene", () => {
    expect(isWebGlBloomBlurScene(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe(true)
    expect(isWebGlBloomBlurScene({ blur: 0.5 })).toBe(false)
  })

  it("formats the clear color and blur-stage labels", () => {
    expect(webGlBloomBlurClearColor(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe("rgba(13, 20, 46, 1.00)")
    expect(webGlBloomBlurAccentColor(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe("rgb(84, 73, 77)")
    expect(webGlBloomBlurStageLabel(DEFAULT_WEBGL_BLOOM_BLUR_SCENE)).toBe(
      "Glow 0.74, blur 0.36, mix 0.64",
    )
  })

  it("summarizes the bloom-blur route", () => {
    expect(webGlBloomBlurSummary(DEFAULT_WEBGL_BLOOM_BLUR_SCENE, "Ready", "webgl2")).toContain(
      "WebGL bloom blur is ready",
    )
  })
})
