import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlTextureGridPageClient } from "./page-client"

describe("WebGlTextureGridPageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGlTextureGridPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Texture Grid" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a WebGL runtime", async () => {
    render(<WebGlTextureGridPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Bold lattice Higher contrast and stronger blend across the uploaded texture.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("15 texels / row")).toBeInTheDocument()
    })
  })
})
