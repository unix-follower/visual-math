import {
  clampNode,
  clampStep,
  DEFAULT_GRAPH_TRAVERSAL_SCENE,
  graphTraversalResult,
  graphTraversalSummary,
  isGraphTraversalLabScene,
  revealedTraversalOrder,
  traversalPath,
} from "./graph-traversal-lab.model"

describe("graph-traversal-lab.model", () => {
  it("recognizes a valid graph traversal scene", () => {
    expect(isGraphTraversalLabScene(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toBe(true)
    expect(isGraphTraversalLabScene({ startNode: 0 })).toBe(false)
  })

  it("derives BFS traversal order and path", () => {
    const result = graphTraversalResult(DEFAULT_GRAPH_TRAVERSAL_SCENE)

    expect(result.order).toEqual([0, 1, 3, 2, 4, 5])
    expect(result.path).toEqual([0, 1, 2, 5])
    expect(revealedTraversalOrder(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toEqual([0, 1, 3, 2, 4, 5])
    expect(traversalPath(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toEqual([0, 1, 2, 5])
  })

  it("contrasts DFS traversal and clamps local controls", () => {
    const result = graphTraversalResult({
      ...DEFAULT_GRAPH_TRAVERSAL_SCENE,
      useBreadthFirst: false,
      revealSteps: 4,
    })

    expect(result.order).toEqual([0, 3, 4, 5])
    expect(result.path).toEqual([0, 3, 4, 5])
    expect(clampNode(8)).toBe(5)
    expect(clampStep(0)).toBe(1)
  })

  it("summarizes the traversal scene", () => {
    expect(graphTraversalSummary(DEFAULT_GRAPH_TRAVERSAL_SCENE)).toContain(
      "breadth-first traversal reaches F with path A -> B -> C -> F",
    )
  })
})
