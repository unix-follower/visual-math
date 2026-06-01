import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlFoundationPageClient } from "./page-client"

describe("WebGlFoundationPageClient", () => {
  it("renders the Phase 6 route and shows the unsupported fallback in jsdom", async () => {
    render(<WebGlFoundationPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Foundation" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates the summary without requiring a WebGL runtime", async () => {
    render(<WebGlFoundationPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Aurora A brighter cool palette to verify clearColor updates without shader work.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("27%")).toBeInTheDocument()
    })
  })
})
