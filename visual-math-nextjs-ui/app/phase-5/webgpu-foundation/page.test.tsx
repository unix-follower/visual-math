import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuFoundationPageClient } from "./page-client"

describe("WebGpuFoundationPageClient", () => {
  it("renders the Phase 5 route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuFoundationPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Foundation" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuFoundationPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ocean Cool tones with a slightly larger primitive to emphasize the first draw call.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/triangle at 74% scale with accent 0.58/)).toBeInTheDocument()
    })
  })
})
