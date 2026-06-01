import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuTextureGridPageClient } from "./page-client"

describe("WebGpuTextureGridPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuTextureGridPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Texture Grid" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuTextureGridPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Bold lattice Higher contrast and stronger blend across the uploaded texture.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/frequency 0.82, contrast 0.92, and blend 0.78/)).toBeInTheDocument()
    })
  })
})
