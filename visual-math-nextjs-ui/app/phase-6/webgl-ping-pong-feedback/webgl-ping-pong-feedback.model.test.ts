import {
  DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE,
  isWebGlPingPongFeedbackScene,
  webGlPingPongFeedbackAccentColor,
  webGlPingPongFeedbackClearColor,
  webGlPingPongFeedbackStageLabel,
  webGlPingPongFeedbackSummary,
} from "./webgl-ping-pong-feedback.model"

describe("webgl-ping-pong-feedback.model", () => {
  it("recognizes a valid ping-pong feedback scene", () => {
    expect(isWebGlPingPongFeedbackScene(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(true)
    expect(isWebGlPingPongFeedbackScene({ feedback: 0.4 })).toBe(false)
  })

  it("formats the clear color and feedback labels", () => {
    expect(webGlPingPongFeedbackClearColor(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(
      "rgba(10, 20, 41, 1.00)",
    )
    expect(webGlPingPongFeedbackAccentColor(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(
      "rgb(84, 74, 67)",
    )
    expect(webGlPingPongFeedbackStageLabel(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE)).toBe(
      "Drift 0.34, feedback 0.62",
    )
  })

  it("summarizes the ping-pong feedback route", () => {
    expect(
      webGlPingPongFeedbackSummary(DEFAULT_WEBGL_PING_PONG_FEEDBACK_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL ping-pong feedback is ready")
  })
})
