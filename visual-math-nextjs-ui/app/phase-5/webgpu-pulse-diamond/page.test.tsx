import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuPulseDiamondPageClient } from "./page-client"

describe("WebGpuPulseDiamondPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuPulseDiamondPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Pulse Diamond" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the animated summary", async () => {
    render(<WebGpuPulseDiamondPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Beacon Faster loop and sharper skew for a more mechanical pulse.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/speed 1.90 with glow 0.58/)).toBeInTheDocument()
    })
  })
})
