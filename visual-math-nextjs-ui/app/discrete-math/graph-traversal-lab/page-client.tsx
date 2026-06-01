"use client"

import { useEffect, useRef, useState } from "react"

import {
  MathWorkbench,
  WorkbenchControlSection,
  WorkbenchMetricGrid,
  WorkbenchPresetGrid,
  WorkbenchRangeControl,
  WorkbenchToggleControl,
  WorkbenchViewportSurface,
} from "@/app/shared/workbench/workbench"
import { stepNumericValue } from "@/app/shared/workbench/workbench-keyboard"
import type {
  RangeControlSchema,
  ToggleControlSchema,
  WorkbenchAction,
  WorkbenchKeyboardShortcut,
  WorkbenchPreset,
} from "@/app/shared/workbench/workbench.models"
import {
  buildWorkbenchShareUrl,
  copyWorkbenchText,
  deserializeWorkbenchScene,
  downloadWorkbenchCanvas,
} from "@/app/shared/workbench/workbench-state"

import {
  clampNode,
  clampStep,
  DEFAULT_GRAPH_TRAVERSAL_SCENE,
  graphNodeLabel,
  graphTraversalResult,
  graphTraversalSummary,
  isGraphTraversalLabScene,
  revealedTraversalOrder,
  traversalPath,
  type GraphTraversalLabScene,
} from "./graph-traversal-lab.model"
import { renderGraphTraversalScene } from "./graph-traversal-lab.renderer"

const GRAPH_TRAVERSAL_ROUTE_PATH = "/discrete-math/graph-traversal-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "startNode",
    label: "Start node",
    min: 0,
    max: 5,
    step: 1,
  },
  {
    kind: "range",
    id: "goalNode",
    label: "Goal node",
    min: 0,
    max: 5,
    step: 1,
  },
  {
    kind: "range",
    id: "revealSteps",
    label: "Reveal steps",
    min: 1,
    max: 6,
    step: 1,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "useBreadthFirst", label: "Use breadth-first search" },
  { kind: "toggle", id: "showVisitOrder", label: "Show visit order" },
]
const PRESETS: readonly WorkbenchPreset<GraphTraversalLabScene>[] = [
  {
    label: "BFS shortest path",
    description: "Breadth-first traversal from A to F with the full reveal.",
    state: {
      startNode: 0,
      goalNode: 5,
      revealSteps: 6,
      useBreadthFirst: true,
      showVisitOrder: true,
    },
  },
  {
    label: "DFS contrast",
    description: "Depth-first traversal over the same start and goal to compare order.",
    state: {
      startNode: 0,
      goalNode: 5,
      revealSteps: 6,
      useBreadthFirst: false,
      showVisitOrder: true,
    },
  },
  {
    label: "Mid-graph target",
    description: "Find a shorter target starting from node C.",
    state: {
      startNode: 2,
      goalNode: 3,
      revealSteps: 5,
      useBreadthFirst: true,
      showVisitOrder: true,
    },
  },
  {
    label: "Order only",
    description: "Hide order labels while keeping traversal progression.",
    state: {
      startNode: 1,
      goalNode: 5,
      revealSteps: 4,
      useBreadthFirst: true,
      showVisitOrder: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized graph traversal scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current discrete-math viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default graph traversal scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Move the start node backward or forward.",
  },
  {
    keys: "Arrow Up/Down",
    description: "Move the goal node backward or forward.",
  },
  {
    keys: "R / Shift+R",
    description: "Increase or decrease the number of revealed steps.",
  },
  {
    keys: "B",
    description: "Toggle breadth-first versus depth-first traversal.",
  },
  { keys: "O", description: "Toggle visit-order labels." },
  { keys: "T", description: "Reset the discrete-math scene." },
]

export function GraphTraversalLabPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<GraphTraversalLabScene>(DEFAULT_GRAPH_TRAVERSAL_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard traversal controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isGraphTraversalLabScene)

    if (initialScene) {
      setScene({
        ...initialScene,
        startNode: clampNode(initialScene.startNode),
        goalNode: clampNode(initialScene.goalNode),
        revealSteps: clampStep(initialScene.revealSteps),
      })
      setStatusMessage("Loaded the discrete-math scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderGraphTraversalScene(canvas, scene)
  }, [scene])

  const traversal = graphTraversalResult(scene)
  const visiblePath = traversalPath(scene)
  const revealed = revealedTraversalOrder(scene)
  const metrics = [
    { label: "Mode", value: scene.useBreadthFirst ? "BFS" : "DFS" },
    { label: "Visited", value: `${revealed.length}/${traversal.order.length}` },
    {
      label: "Path length",
      value: traversal.foundGoal
        ? `${Math.max(traversal.path.length - 1, 0)} edges`
        : "Goal not reached",
    },
    {
      label: "Path",
      value:
        visiblePath.length > 0
          ? visiblePath.map(graphNodeLabel).join(" -> ")
          : "Hidden or incomplete",
    },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(GRAPH_TRAVERSAL_ROUTE_PATH, scene),
        )
        setStatusMessage(
          wasCopied
            ? "Share link copied to the clipboard."
            : "Clipboard copy is unavailable in this environment.",
        )
        break
      }
      case "export-png": {
        const didDownload = canvasRef.current
          ? downloadWorkbenchCanvas(canvasRef.current, "graph-traversal-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_GRAPH_TRAVERSAL_SCENE)
        setStatusMessage("Graph traversal scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          startNode: stepNumericValue(current.startNode, -1, clampNode),
        }))
        setStatusMessage("Start node moved backward.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          startNode: stepNumericValue(current.startNode, 1, clampNode),
        }))
        setStatusMessage("Start node moved forward.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          goalNode: stepNumericValue(current.goalNode, 1, clampNode),
        }))
        setStatusMessage("Goal node moved forward.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          goalNode: stepNumericValue(current.goalNode, -1, clampNode),
        }))
        setStatusMessage("Goal node moved backward.")
        break
      case "r":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          revealSteps: stepNumericValue(current.revealSteps, 1, clampStep),
        }))
        setStatusMessage("Reveal steps increased.")
        break
      case "R":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          revealSteps: stepNumericValue(current.revealSteps, -1, clampStep),
        }))
        setStatusMessage("Reveal steps decreased.")
        break
      case "b":
      case "B":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          useBreadthFirst: !current.useBreadthFirst,
        }))
        setStatusMessage("Traversal mode toggled.")
        break
      case "o":
      case "O":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showVisitOrder: !current.showVisitOrder,
        }))
        setStatusMessage("Visit-order labels toggled.")
        break
      case "t":
      case "T":
        event.preventDefault()
        setScene(DEFAULT_GRAPH_TRAVERSAL_SCENE)
        setStatusMessage("Graph traversal scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Graph Traversal Lab"
      description="A Next.js Canvas route for comparing breadth-first and depth-first traversal order, revealed search state, and discovered paths on a fixed graph."
      highlights={[
        "Weekly discrete-math slice built without changing the shared workbench API",
        "Breadth-first versus depth-first order on the same graph surface",
        "Revealed traversal state and discovered path using the same share, reset, export, and keyboard contract",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Traversal setup">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    GraphTraversalLabScene,
                    "startNode" | "goalNode" | "revealSteps"
                  >
                ]
              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "revealSteps"
                      ? `${Math.round(value)}`
                      : graphNodeLabel(Math.round(value))
                  }
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]:
                        control.id === "revealSteps" ? clampStep(nextValue) : clampNode(nextValue),
                    }))
                  }
                />
              )
            })}
          </WorkbenchControlSection>

          <WorkbenchControlSection heading="Visibility">
            {TOGGLE_CONTROLS.map((control) => (
              <WorkbenchToggleControl
                key={control.id}
                control={control}
                checked={
                  scene[
                    control.id as keyof Pick<
                      GraphTraversalLabScene,
                      "useBreadthFirst" | "showVisitOrder"
                    >
                  ]
                }
                onChange={(checked) =>
                  setScene((current) => ({ ...current, [control.id]: checked }))
                }
              />
            ))}
          </WorkbenchControlSection>

          <WorkbenchControlSection heading="Presets">
            <WorkbenchPresetGrid
              presets={PRESETS}
              onPreset={(preset) => {
                setScene(preset.state)
                setStatusMessage(`Applied preset: ${preset.label}.`)
              }}
            />
          </WorkbenchControlSection>
        </>
      }
      viewport={
        <>
          <WorkbenchViewportSurface
            ariaLabel="Graph traversal lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current graph traversal scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{graphTraversalSummary(scene)}</p>
          <p className="vm-copy">
            This route extends Phase 4 into discrete math by showing how search order and discovered
            paths differ between BFS and DFS while keeping the same route-local model and renderer
            split used across the other Next.js Canvas slices.
          </p>
        </>
      }
    />
  )
}
