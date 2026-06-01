import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlDepthPrismPageClient } from "./page-client"

describe("WebGlDepthPrismPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlDepthPrismPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Depth Prism" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates occlusion metrics without a WebGL runtime", async () => {
    render(<WebGlDepthPrismPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Tall orbit Higher camera pitch and lift to emphasize top-face visibility and occlusion.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("yaw 34°, pitch 28°, distance 4.9")).toBeInTheDocument()
      expect(screen.getByText("lift 0.78, spread 0.46")).toBeInTheDocument()
    })
  })
})
