import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlIndexedPolygonPageClient } from "./page-client"

describe("WebGlIndexedPolygonPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlIndexedPolygonPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Indexed Polygon" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates indexed metrics without a WebGL runtime", async () => {
    render(<WebGlIndexedPolygonPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Octagon Dense indexed fan showing higher topology and a cooler backdrop.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("9")).toBeInTheDocument()
      expect(screen.getByText("24")).toBeInTheDocument()
    })
  })
})
