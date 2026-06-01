import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuIndirectIndexedPolygonPageClient } from "./page-client"

describe("WebGpuIndirectIndexedPolygonPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuIndirectIndexedPolygonPageClient serializedScene={null} />)

    expect(
      screen.getByRole("heading", { name: "WebGPU Indirect Indexed Polygon" }),
    ).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuIndirectIndexedPolygonPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Full octagon Eight sides and full encoded coverage for the complete indexed fan.",
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/9 vertices, 24 total indices, and 24 indices encoded/),
      ).toBeInTheDocument()
    })
  })
})
