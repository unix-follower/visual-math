import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlDualPassPageClient } from "./page-client"

describe("WebGlDualPassPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlDualPassPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Dual Pass" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates dual-pass metrics without a WebGL runtime", async () => {
    render(<WebGlDualPassPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hot prism Higher glow and stronger composite mix for a brighter offscreen lift.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(104, 96, 96)")).toBeInTheDocument()
      expect(screen.getByText("Pass 1 skew 0.66, pass 2 mix 0.82")).toBeInTheDocument()
    })
  })
})
