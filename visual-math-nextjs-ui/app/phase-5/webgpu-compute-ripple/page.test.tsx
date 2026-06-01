import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuComputeRipplePageClient } from "./page-client"

describe("WebGpuComputeRipplePageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuComputeRipplePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Compute Ripple" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuComputeRipplePageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "High energy Stronger amplitude and frequency for a more dramatic compute-written triangle.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/amplitude 0.88, frequency 0.86, and drift 0.52/)).toBeInTheDocument()
    })
  })
})
