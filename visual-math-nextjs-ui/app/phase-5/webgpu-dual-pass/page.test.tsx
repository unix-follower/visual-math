import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuDualPassPageClient } from "./page-client"

describe("WebGpuDualPassPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuDualPassPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Dual Pass" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuDualPassPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Wide bloom Stronger glow and skew with a brighter composite target.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/glow 0.90, skew 0.74, and mix 0.66/)).toBeInTheDocument()
    })
  })
})
