import { fireEvent, render, screen } from "@testing-library/react"

import { LimitsLabPageClient } from "./page-client"

describe("LimitsLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<LimitsLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Limits Lab" })).toBeInTheDocument()
    expect(screen.getByText(/As x approaches 0.00/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<LimitsLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Shifted target Move the limit point away from the origin.",
      }),
    )
    expect(screen.getByText(/As x approaches 1.25/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Limits lab viewport"), {
      key: "R",
    })
    expect(screen.getByText(/As x approaches 0.00/)).toBeInTheDocument()
  })
})
