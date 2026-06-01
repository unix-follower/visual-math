import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlPingPongFeedbackPageClient } from "./page-client"

describe("WebGlPingPongFeedbackPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlPingPongFeedbackPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Ping-Pong Feedback" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates feedback metrics without a WebGL runtime", async () => {
    render(<WebGlPingPongFeedbackPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Wide smear Higher drift and feedback for a softer echoed trail between feedback passes.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(93, 89, 86)")).toBeInTheDocument()
      expect(screen.getByText("Drift 0.62, feedback 0.82")).toBeInTheDocument()
    })
  })
})
