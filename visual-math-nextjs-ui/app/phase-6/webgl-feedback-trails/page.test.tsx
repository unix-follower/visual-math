import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlFeedbackTrailsPageClient } from "./page-client"

describe("WebGlFeedbackTrailsPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlFeedbackTrailsPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Feedback Trails" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates trail metrics without a WebGL runtime", async () => {
    render(<WebGlFeedbackTrailsPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Heat ribbon Hotter seed with shorter but brighter relays.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(129, 81, 34)")).toBeInTheDocument()
      expect(screen.getByText("7 relays, drift 0.22, decay 0.72")).toBeInTheDocument()
      expect(screen.getByText("7")).toBeInTheDocument()
    })
  })
})
