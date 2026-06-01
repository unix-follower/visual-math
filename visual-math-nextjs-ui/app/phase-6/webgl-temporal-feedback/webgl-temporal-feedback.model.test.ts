import {
  DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE,
  isWebGlTemporalFeedbackScene,
  webGlTemporalFeedbackAccentColor,
  webGlTemporalFeedbackClearColor,
  webGlTemporalFeedbackPersistence,
  webGlTemporalFeedbackStageLabel,
  webGlTemporalFeedbackSummary,
} from "./webgl-temporal-feedback.model"

describe("webgl-temporal-feedback.model", () => {
  it("recognizes a valid temporal feedback scene", () => {
    expect(isWebGlTemporalFeedbackScene(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(true)
    expect(isWebGlTemporalFeedbackScene({ speed: 0.9 })).toBe(false)
  })

  it("formats derived labels for the animated scene", () => {
    expect(webGlTemporalFeedbackClearColor(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "rgba(5, 13, 28, 1.00)",
    )
    expect(webGlTemporalFeedbackAccentColor(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "rgb(111, 86, 78)",
    )
    expect(webGlTemporalFeedbackPersistence(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "68% retained per frame",
    )
    expect(webGlTemporalFeedbackStageLabel(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE)).toBe(
      "1 relay per frame, drift 0.34, decay 0.62",
    )
  })

  it("summarizes the temporal feedback route", () => {
    expect(
      webGlTemporalFeedbackSummary(DEFAULT_WEBGL_TEMPORAL_FEEDBACK_SCENE, "Ready", 0.25, "webgl2"),
    ).toContain("WebGL temporal feedback is ready")
  })
})
