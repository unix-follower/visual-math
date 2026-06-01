import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuGradientQuadPageClient } from "./page-client"

describe("WebGpuGradientQuadPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuGradientQuadPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Gradient Quad" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuGradientQuadPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Blueprint Cool background with a tighter surface and higher intensity.",
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/tilted gradient surface with inset 0.16 and intensity 0.92/),
      ).toBeInTheDocument()
    })
  })
})
