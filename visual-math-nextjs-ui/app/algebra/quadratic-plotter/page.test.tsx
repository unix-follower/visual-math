import { fireEvent, render, screen } from "@testing-library/react"

import { QuadraticPlotterPageClient } from "./page-client"

describe("QuadraticPlotterPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<QuadraticPlotterPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Quadratic Plotter" })).toBeInTheDocument()
    expect(screen.getByText(/roots -1.00 and 3.00/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<QuadraticPlotterPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Repeated root Tangent parabola at the x-axis.",
      }),
    )
    expect(screen.getByText(/vertex at \(2.00, 0.00\)/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Quadratic plotter viewport"), {
      key: "R",
    })
    expect(screen.getByText(/roots -1.00 and 3.00/)).toBeInTheDocument()
  })
})
