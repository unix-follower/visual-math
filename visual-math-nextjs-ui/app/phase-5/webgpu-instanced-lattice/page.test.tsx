import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuInstancedLatticePageClient } from "./page-client"

describe("WebGpuInstancedLatticePageClient", () => {
  it("renders the Phase 5 route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuInstancedLatticePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Instanced Lattice" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuInstancedLatticePageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Wide relay Broader spacing and flatter instance geometry.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/spacing 0.84, scale 0.30, and tilt 0.62/)).toBeInTheDocument()
    })
  })
})
