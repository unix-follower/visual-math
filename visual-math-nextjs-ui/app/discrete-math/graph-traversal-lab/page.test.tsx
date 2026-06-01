import { fireEvent, render, screen } from "@testing-library/react"

import { GraphTraversalLabPageClient } from "./page-client"

describe("GraphTraversalLabPageClient", () => {
  it("renders the route title and default summary", () => {
    render(<GraphTraversalLabPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "Graph Traversal Lab" })).toBeInTheDocument()
    expect(
      screen.getByText(/breadth-first traversal reaches F with path A -> B -> C -> F/),
    ).toBeInTheDocument()
  })

  it("applies a preset and resets from the keyboard", () => {
    render(<GraphTraversalLabPageClient serializedScene={null} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "DFS contrast Depth-first traversal over the same start and goal to compare order.",
      }),
    )
    expect(
      screen.getByText(/depth-first traversal reaches F with path A -> D -> E -> F/),
    ).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText("Graph traversal lab viewport"), {
      key: "T",
    })
    expect(
      screen.getByText(/breadth-first traversal reaches F with path A -> B -> C -> F/),
    ).toBeInTheDocument()
  })
})
