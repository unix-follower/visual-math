import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuIndexedPolygonPageClient } from "./page-client"

describe("WebGpuIndexedPolygonPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGpuIndexedPolygonPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Indexed Polygon" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates indexed metrics without a GPU runtime", async () => {
    render(<WebGpuIndexedPolygonPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

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
