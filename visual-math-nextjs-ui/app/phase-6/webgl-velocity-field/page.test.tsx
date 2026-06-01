import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlVelocityFieldPageClient } from "./page-client"

describe("WebGlVelocityFieldPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlVelocityFieldPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Velocity Field" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates flow metrics without a WebGL runtime", async () => {
    render(<WebGlVelocityFieldPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Ribbon drift Higher shear and slower motion for stretched ribbon-like transport.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("rgb(128, 118, 174)")).toBeInTheDocument()
      expect(screen.getByText("swirl 0.34, shear 0.72")).toBeInTheDocument()
      expect(screen.getByText("69% retained")).toBeInTheDocument()
    })
  })
})
