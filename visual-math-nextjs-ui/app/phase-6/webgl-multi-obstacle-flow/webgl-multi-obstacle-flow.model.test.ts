import {
  DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
  isWebGlMultiObstacleFlowScene,
  webGlMultiObstacleFlowClearColor,
  webGlMultiObstacleFlowInjectionLabel,
  webGlMultiObstacleFlowLabel,
  webGlMultiObstacleFlowPrimaryLabel,
  webGlMultiObstacleFlowSecondaryLabel,
  webGlMultiObstacleFlowSummary,
} from "./webgl-multi-obstacle-flow.model"

describe("webgl-multi-obstacle-flow.model", () => {
  it("recognizes a valid multi-obstacle scene", () => {
    expect(isWebGlMultiObstacleFlowScene(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(true)
    expect(isWebGlMultiObstacleFlowScene({ speed: 1 })).toBe(false)
  })

  it("formats the derived labels", () => {
    expect(webGlMultiObstacleFlowClearColor(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "rgba(8, 13, 20, 1.00)",
    )
    expect(webGlMultiObstacleFlowInjectionLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "0.24, 0.62 at 0.78",
    )
    expect(webGlMultiObstacleFlowPrimaryLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "0.42, 0.50 radius 0.16",
    )
    expect(webGlMultiObstacleFlowSecondaryLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "0.74, 0.38 radius 0.12",
    )
    expect(webGlMultiObstacleFlowLabel(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe(
      "swirl 0.58, retention 0.62, mix 0.68",
    )
  })

  it("summarizes the route", () => {
    expect(
      webGlMultiObstacleFlowSummary(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE, "Ready", "webgl2"),
    ).toContain("WebGL multi-obstacle flow is ready")
  })
})
