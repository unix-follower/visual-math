import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlTemporalFeedbackPageClient } from "./page-client"

describe("WebGlTemporalFeedbackPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlTemporalFeedbackPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Temporal Feedback" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates animated metrics without a WebGL runtime", async () => {
    render(<WebGlTemporalFeedbackPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Prism current Faster loop with hotter injected energy and sharper drift.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(138, 94, 103)")).toBeInTheDocument()
      expect(screen.getByText("61% retained per frame")).toBeInTheDocument()
      expect(screen.getByText("1 relay per frame, drift 0.54, decay 0.48")).toBeInTheDocument()
    })
  })
})
