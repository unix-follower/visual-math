import { fireEvent, render, screen } from "@testing-library/react"

import { UnitCirclePageClient } from "./page-client"

describe("UnitCirclePageClient", () => {
  it("renders the route title and default summary", () => {
    render(<UnitCirclePageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Unit Circle" })).toBeInTheDocument()
    expect(screen.getByText(/cosine 0.707/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<UnitCirclePageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "90 degrees Tangent becomes undefined.",
      }),
    )
    expect(screen.getByText(/tangent undefined/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Unit circle viewport"), {
      key: "R",
    })
    expect(screen.getByText(/cosine 0.707/)).toBeInTheDocument()
  })
})
