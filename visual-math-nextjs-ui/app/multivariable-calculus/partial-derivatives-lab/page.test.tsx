import { fireEvent, render, screen } from "@testing-library/react"

import { PartialDerivativesLabPageClient } from "./page-client"

describe("PartialDerivativesLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<PartialDerivativesLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Partial Derivatives Lab" })).toBeInTheDocument()
    expect(screen.getByText(/At \(1.00, -1.00\), the surface height is 1.60/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<PartialDerivativesLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Saddle point Negative coupling dominates to create mixed directional behavior.",
      }),
    )
    expect(screen.getByText(/At \(0.75, 0.75\), the surface height is -0.56/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Partial derivatives lab viewport"), {
      key: "R",
    })
    expect(screen.getByText(/At \(1.00, -1.00\), the surface height is 1.60/)).toBeInTheDocument()
  })
})
