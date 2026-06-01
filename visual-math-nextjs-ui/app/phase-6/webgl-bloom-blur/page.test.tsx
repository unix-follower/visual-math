import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlBloomBlurPageClient } from "./page-client"

describe("WebGlBloomBlurPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlBloomBlurPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Bloom Blur" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates bloom metrics without a WebGL runtime", async () => {
    render(<WebGlBloomBlurPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Neon haze Higher glow and blur with stronger mix for a softer lifted bloom field.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(97, 85, 100)")).toBeInTheDocument()
      expect(screen.getByText("Glow 0.90, blur 0.68, mix 0.82")).toBeInTheDocument()
    })
  })
})
