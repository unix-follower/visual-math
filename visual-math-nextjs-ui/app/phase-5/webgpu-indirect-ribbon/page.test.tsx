import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGpuIndirectRibbonPageClient } from "./page-client"

describe("WebGpuIndirectRibbonPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGpuIndirectRibbonPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGPU Indirect Ribbon" })).toBeInTheDocument()

    await screen.findByText(/WebGPU is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a GPU runtime", async () => {
    render(<WebGpuIndirectRibbonPageClient serializedScene={null} />)

    await screen.findByText(/WebGPU is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Wide echo Broader ribbon and more indirect instances from the draw buffer.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText(/span 0.84, taper 0.24, and echo 0.88/)).toBeInTheDocument()
    })
  })
})
