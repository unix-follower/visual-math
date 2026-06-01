import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlGradientTrianglePageClient } from "./page-client"

describe("WebGlGradientTrianglePageClient", () => {
  it("renders the route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGlGradientTrianglePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Gradient Triangle" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a WebGL runtime", async () => {
    render(<WebGlGradientTrianglePageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Blueprint Cooler background with a tighter triangle and stronger accent lift.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("-12 deg")).toBeInTheDocument()
    })
  })
})
