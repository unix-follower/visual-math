import { fireEvent, render, screen } from "@testing-library/react"

import { TriangleExplorerPageClient } from "./page-client"

describe("TriangleExplorerPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<TriangleExplorerPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Triangle Explorer" })).toBeInTheDocument()
    expect(screen.getByText(/area 12.00/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<TriangleExplorerPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Tall triangle Pushes centroid upward and changes perimeter.",
      }),
    )
    expect(screen.getByText(/area 14.00/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Triangle explorer viewport"), {
      key: "R",
    })
    expect(screen.getByText(/area 12.00/)).toBeInTheDocument()
  })
})
