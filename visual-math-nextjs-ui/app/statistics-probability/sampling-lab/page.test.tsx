import { fireEvent, render, screen } from "@testing-library/react"

import { SamplingLabPageClient } from "./page-client"

describe("SamplingLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<SamplingLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Sampling Lab" })).toBeInTheDocument()
    expect(screen.getByText(/Across 60 experiments of 10 Bernoulli trials/)).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<SamplingLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Rare event Low-probability successes with many trials.",
      }),
    )
    expect(screen.getByText(/Across 90 experiments of 18 Bernoulli trials/)).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Sampling lab viewport"), {
      key: "R",
    })
    expect(screen.getByText(/Across 60 experiments of 10 Bernoulli trials/)).toBeInTheDocument()
  })
})
