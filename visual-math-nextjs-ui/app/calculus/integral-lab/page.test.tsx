import { fireEvent, render, screen } from "@testing-library/react"

import { IntegralLabPageClient } from "./page-client"

describe("IntegralLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<IntegralLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Integral Lab" })).toBeInTheDocument()
    expect(screen.getByText(/From x = 0 to x = 4.50/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<IntegralLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Short interval A compact accumulation window with visible midpoint rectangles.",
      }),
    )
    expect(screen.getByText(/From x = 0 to x = 2.50/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Integral lab viewport"), {
      key: "R",
    })
    expect(screen.getByText(/From x = 0 to x = 4.50/)).toBeInTheDocument()
  })
})
