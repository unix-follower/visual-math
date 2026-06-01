import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuStoragePalettePageClient } from "./page-client"

describe("WebGpuStoragePalettePageClient", () => {
  it("renders the Phase 5 route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuStoragePalettePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Storage Palette" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuStoragePalettePageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Signal burst Higher contrast and glow for stronger vertex-color separation.",
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/warmth 0.78, contrast 0.94, balance 0.28, and glow 0.86/),
      ).toBeInTheDocument()
    })
  })
})
