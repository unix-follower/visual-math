import { fireEvent, render, screen } from "@testing-library/react"

import { DistributionLabPageClient } from "./page-client"

describe("DistributionLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<DistributionLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Distribution Lab" })).toBeInTheDocument()
    expect(
      screen.getByText(/For 8 Bernoulli trials at success probability 0.45/),
    ).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<DistributionLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Rare success Low-probability outcomes concentrated near zero.",
      }),
    )
    expect(
      screen.getByText(/For 12 Bernoulli trials at success probability 0.20/),
    ).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Distribution lab viewport"), {
      key: "R",
    })
    expect(
      screen.getByText(/For 8 Bernoulli trials at success probability 0.45/),
    ).toBeInTheDocument()
  })
})
