import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlShadowReliefPageClient } from "./page-client"

describe("WebGlShadowReliefPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlShadowReliefPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Shadow Relief" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates relief metrics without a WebGL runtime", async () => {
    render(<WebGlShadowReliefPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Deep engraving Higher relief and shadow with a lower gloss for stronger carved contrast.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(144, 141, 193)")).toBeInTheDocument()
      expect(screen.getByText("0.68, 0.36, 0.78")).toBeInTheDocument()
      expect(screen.getByText("relief 0.82, shadow 0.78, gloss 0.22")).toBeInTheDocument()
    })
  })
})
