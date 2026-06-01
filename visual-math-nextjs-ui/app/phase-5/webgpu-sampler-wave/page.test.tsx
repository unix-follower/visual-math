import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuSamplerWavePageClient } from "./page-client"

describe("WebGpuSamplerWavePageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuSamplerWavePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Sampler Wave" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuSamplerWavePageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Sharp crest Higher frequency and lower softness to emphasize sharper filtering differences.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/frequency 0.86, softness 0.24, and blend 0.72/)).toBeInTheDocument()
    })
  })
})
