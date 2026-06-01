import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlTexturedMaterialPageClient } from "./page-client"

describe("WebGlTexturedMaterialPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlTexturedMaterialPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Textured Material" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates texture-backed metrics without a WebGL runtime", async () => {
    render(<WebGlTexturedMaterialPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Embossed alloy Higher texture and gloss with more relief for sharper material separation.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(162, 150, 191)")).toBeInTheDocument()
      expect(screen.getByText("0.72, 0.48, fill 0.42")).toBeInTheDocument()
      expect(screen.getByText("texture 0.88, relief 0.72, gloss 0.78")).toBeInTheDocument()
    })
  })
})
