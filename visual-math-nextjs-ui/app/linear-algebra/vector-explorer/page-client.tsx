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
  DEFAULT_VECTOR_SCENE,
  isVectorScene,
  type VectorScene,
  vectorAngleDegrees,
  vectorMagnitude,
  vectorQuadrantLabel,
  vectorSummary,
} from "./vector-explorer.model"
import { renderVectorScene } from "./vector-explorer.renderer"

const VECTOR_ROUTE_PATH = "/linear-algebra/vector-explorer"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "x", label: "X component", min: -6, max: 6, step: 0.5 },
  { kind: "range", id: "y", label: "Y component", min: -6, max: 6, step: 0.5 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "basisVisible", label: "Show basis labels" },
  {
    kind: "toggle",
    id: "projectionVisible",
    label: "Show component projection",
  },
]
const PRESETS: readonly WorkbenchPreset<VectorScene>[] = [
  {
    label: "Applied default",
    description: "Balanced first-quadrant engineering vector.",
    state: {
      vector: { x: 3, y: 2 },
      basisVisible: true,
      projectionVisible: true,
    },
  },
  {
    label: "Axis aligned",
    description: "Pure horizontal component.",
    state: {
      vector: { x: 5, y: 0 },
      basisVisible: true,
      projectionVisible: true,
    },
  },
  {
    label: "Quadrant II",
    description: "Negative x and positive y.",
    state: {
      vector: { x: -2, y: 4 },
      basisVisible: true,
      projectionVisible: true,
    },
  },
  {
    label: "Quadrant III",
    description: "Negative vector with both components visible.",
    state: {
      vector: { x: -4, y: -3 },
      basisVisible: true,
      projectionVisible: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized vector scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current vector viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default vector scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow keys",
    description: "Move the vector tip while the viewport is focused.",
  },
  {
    keys: "Shift + Arrow keys",
    description: "Move faster by one unit per keypress.",
  },
  { keys: "B", description: "Toggle basis labels." },
  { keys: "P", description: "Toggle projection lines." },
  { keys: "R", description: "Reset the vector to the default preset." },
]

export function VectorExplorerPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<VectorScene>(DEFAULT_VECTOR_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard vector controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isVectorScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the vector scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderVectorScene(canvas, scene)
  }, [scene])

  const metrics = [
    { label: "Magnitude", value: vectorMagnitude(scene.vector).toFixed(2) },
    {
      label: "Angle",
      value: `${vectorAngleDegrees(scene.vector).toFixed(1)}°`,
    },
    { label: "Quadrant", value: vectorQuadrantLabel(scene.vector) },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(buildWorkbenchShareUrl(VECTOR_ROUTE_PATH, scene))
        setStatusMessage(
          wasCopied
            ? "Share link copied to the clipboard."
            : "Clipboard copy is unavailable in this environment.",
        )
        break
      }
      case "export-png": {
        const didDownload = canvasRef.current
          ? downloadWorkbenchCanvas(canvasRef.current, "vector-explorer.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_VECTOR_SCENE)
        setStatusMessage("Vector scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? 1 : 0.5

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          vector: {
            ...current.vector,
            y: stepNumericValue(current.vector.y, step, (value) => clamp(value, -6, 6)),
          },
        }))
        setStatusMessage("Vector moved upward.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          vector: {
            ...current.vector,
            y: stepNumericValue(current.vector.y, -step, (value) => clamp(value, -6, 6)),
          },
        }))
        setStatusMessage("Vector moved downward.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          vector: {
            ...current.vector,
            x: stepNumericValue(current.vector.x, step, (value) => clamp(value, -6, 6)),
          },
        }))
        setStatusMessage("Vector moved right.")
        break
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          vector: {
            ...current.vector,
            x: stepNumericValue(current.vector.x, -step, (value) => clamp(value, -6, 6)),
          },
        }))
        setStatusMessage("Vector moved left.")
        break
      case "b":
      case "B":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          basisVisible: !current.basisVisible,
        }))
        setStatusMessage("Basis labels toggled.")
        break
      case "p":
      case "P":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          projectionVisible: !current.projectionVisible,
        }))
        setStatusMessage("Projection lines toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_VECTOR_SCENE)
        setStatusMessage("Vector scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Vector Explorer"
      description="A Next.js Canvas route for exploring vector components, magnitude, and direction with the same route-local model and renderer split used across the current Phase 4 workbench."
      highlights={[
        "Daily linear algebra slice built on the existing shared React workbench",
        "Serialized scene state and export/share actions reused without new infrastructure",
        "Keyboard-driven vector movement and visibility toggles inside a focused viewport",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Components">
            {RANGE_CONTROLS.map((control) => (
              <WorkbenchRangeControl
                key={control.id}
                control={control}
                value={control.id === "x" ? scene.vector.x : scene.vector.y}
                displayValue={(control.id === "x" ? scene.vector.x : scene.vector.y).toFixed(1)}
                onChange={(nextValue) =>
                  setScene((current) => ({
                    ...current,
                    vector:
                      control.id === "x"
                        ? { ...current.vector, x: nextValue }
                        : { ...current.vector, y: nextValue },
                  }))
                }
              />
            ))}
          </WorkbenchControlSection>

          <WorkbenchControlSection heading="Visibility">
            {TOGGLE_CONTROLS.map((control) => (
              <WorkbenchToggleControl
                key={control.id}
                control={control}
                checked={
                  control.id === "basisVisible" ? scene.basisVisible : scene.projectionVisible
                }
                onChange={(checked) =>
                  setScene((current) =>
                    control.id === "basisVisible"
                      ? { ...current, basisVisible: checked }
                      : { ...current, projectionVisible: checked },
                  )
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
            ariaLabel="Vector explorer viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current vector scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{vectorSummary(scene.vector)}</p>
          <p className="vm-copy">
            This route resumes Phase 4 by porting the daily linear algebra slice into the same
            shared Next.js workbench contract already used by the current algebra, trigonometry,
            geometry, and calculus routes.
          </p>
        </>
      }
    />
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
