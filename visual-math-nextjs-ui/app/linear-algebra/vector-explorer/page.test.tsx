import { fireEvent, render, screen } from "@testing-library/react"

import { VectorExplorerPageClient } from "./page-client"

describe("VectorExplorerPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<VectorExplorerPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Vector Explorer" })).toBeInTheDocument()
    expect(screen.getByText(/Vector \(3.0, 2.0\) has magnitude 3.61/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<VectorExplorerPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Quadrant II Negative x and positive y.",
      }),
    )
    expect(screen.getByText(/Vector \(-2.0, 4.0\) has magnitude 4.47/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Vector explorer viewport"), {
      key: "R",
    })
    expect(screen.getByText(/Vector \(3.0, 2.0\) has magnitude 3.61/)).toBeInTheDocument()
  })
})
