import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlUniformTransformPageClient } from "./page-client"

describe("WebGlUniformTransformPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGlUniformTransformPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Uniform Transform" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates the route summary", async () => {
    render(<WebGlUniformTransformPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Orbit corner Stronger translation and rotation to emphasize GPU-side transform control.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("(-0.18, 0.16)")).toBeInTheDocument()
    })
  })
})
