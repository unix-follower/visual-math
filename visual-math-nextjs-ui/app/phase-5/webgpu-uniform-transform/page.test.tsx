import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuUniformTransformPageClient } from "./page-client"

describe("WebGpuUniformTransformPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuUniformTransformPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Uniform Transform" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the route summary", async () => {
    render(<WebGpuUniformTransformPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Orbit corner Stronger translation and rotation to emphasize GPU-side transform control.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/rotation -34 degrees/)).toBeInTheDocument()
      expect(screen.getByText(/offset \(-0.18, 0.16\)/)).toBeInTheDocument()
    })
  })
})
