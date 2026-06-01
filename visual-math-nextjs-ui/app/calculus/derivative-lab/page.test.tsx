import { fireEvent, render, screen } from "@testing-library/react"

import { DerivativeLabPageClient } from "./page-client"

describe("DerivativeLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<DerivativeLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Derivative Lab" })).toBeInTheDocument()
    expect(screen.getByText(/tangent slope is 1.90/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<DerivativeLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Concave down Negative curvature to flip the curve.",
      }),
    )
    expect(screen.getByText(/tangent slope is -0.60/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Derivative lab viewport"), {
      key: "R",
    })
    expect(screen.getByText(/tangent slope is 1.90/)).toBeInTheDocument()
  })
})
