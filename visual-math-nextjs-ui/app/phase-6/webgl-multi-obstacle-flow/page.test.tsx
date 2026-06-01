import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import {
  applyObstacleDrag,
  pickClosestObstacle,
  WebGlMultiObstacleFlowPageClient,
} from "./page-client"
import { DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE } from "./webgl-multi-obstacle-flow.model"

describe("WebGlMultiObstacleFlowPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlMultiObstacleFlowPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Multi-Obstacle Flow" })).toBeInTheDocument()
    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and drags the nearest obstacle before resuming injection steering", async () => {
    render(<WebGlMultiObstacleFlowPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Gate flow Primary and secondary obstacles form a narrow channel through the center.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("0.18, 0.52 at 0.62")).toBeInTheDocument()
      expect(screen.getByText("0.46, 0.62 radius 0.22")).toBeInTheDocument()
      expect(screen.getByText("0.62, 0.34 radius 0.20")).toBeInTheDocument()
      expect(screen.getByText("swirl 0.44, retention 0.74, mix 0.58")).toBeInTheDocument()
    })

    const surface = screen.getByLabelText("WebGL multi-obstacle flow viewport") as HTMLDivElement
    jest.spyOn(surface, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(surface, { clientX: 40, clientY: 50 })
    fireEvent.pointerMove(surface, { clientX: 52, clientY: 28 })
    fireEvent.pointerUp(surface, { clientX: 52, clientY: 28 })
    fireEvent.pointerMove(surface, { clientX: 82, clientY: 18 })

    await waitFor(() => {
      expect(screen.getByText("Moved the flow injection source.")).toBeInTheDocument()
    })
  })

  it("chooses and updates the nearest obstacle", () => {
    expect(pickClosestObstacle(0.4, 0.5, DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE)).toBe("primary")
    expect(
      applyObstacleDrag(DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE, "primary", 0.52, 0.72),
    ).toMatchObject({
      primaryX: 0.52,
      primaryY: 0.72,
      secondaryX: DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryX,
      secondaryY: DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE.secondaryY,
    })
  })
})
