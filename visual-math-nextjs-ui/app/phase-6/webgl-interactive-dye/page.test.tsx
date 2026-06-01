import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlInteractiveDyePageClient } from "./page-client"

describe("WebGlInteractiveDyePageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlInteractiveDyePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Interactive Dye" })).toBeInTheDocument()
    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates pointer-driven metrics without a WebGL runtime", async () => {
    render(<WebGlInteractiveDyePageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Top spill Higher injection position with slower movement and tighter obstacle radius.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("0.40, 0.78 at 0.62")).toBeInTheDocument()
      expect(screen.getByText("0.74, 0.46 radius 0.10")).toBeInTheDocument()
      expect(screen.getByText("swirl 0.34, retention 0.76, mix 0.52")).toBeInTheDocument()
    })
  })
})
