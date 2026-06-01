import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlLitMaterialPageClient } from "./page-client"

describe("WebGlLitMaterialPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlLitMaterialPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Lit Material" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates material metrics without a WebGL runtime", async () => {
    render(<WebGlLitMaterialPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Neon alloy Higher metalness, lower roughness, and stronger rim light for a sharper highlight band.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(172, 170, 211)")).toBeInTheDocument()
      expect(screen.getByText("0.80, 0.64, 0.82")).toBeInTheDocument()
      expect(screen.getByText("metal 0.84, roughness 0.14, rim 0.66")).toBeInTheDocument()
    })
  })
})
