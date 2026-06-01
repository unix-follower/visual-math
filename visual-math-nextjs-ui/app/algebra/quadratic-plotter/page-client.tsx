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
  DEFAULT_QUADRATIC_SCENE,
  isQuadraticScene,
  type QuadraticScene,
  quadraticDiscriminant,
  quadraticRoots,
  quadraticSummary,
  quadraticVertex,
} from "./quadratic-plotter.model"
import { renderQuadraticScene } from "./quadratic-plotter.renderer"

const QUADRATIC_ROUTE_PATH = "/algebra/quadratic-plotter"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "a",
    label: "a coefficient",
    min: -3,
    max: 3,
    step: 0.25,
  },
  {
    kind: "range",
    id: "b",
    label: "b coefficient",
    min: -6,
    max: 6,
    step: 0.5,
  },
  {
    kind: "range",
    id: "c",
    label: "c coefficient",
    min: -8,
    max: 8,
    step: 0.5,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showRoots", label: "Show roots" },
  { kind: "toggle", id: "showVertex", label: "Show vertex" },
]
const PRESETS: readonly WorkbenchPreset<QuadraticScene>[] = [
  {
    label: "Two real roots",
    description: "Default engineering-friendly parabola.",
    state: { a: 1, b: -2, c: -3, showRoots: true, showVertex: true },
  },
  {
    label: "Repeated root",
    description: "Tangent parabola at the x-axis.",
    state: { a: 1, b: -4, c: 4, showRoots: true, showVertex: true },
  },
  {
    label: "No real roots",
    description: "Positive discriminant disappears.",
    state: { a: 1, b: 2, c: 5, showRoots: true, showVertex: true },
  },
  {
    label: "Inverted parabola",
    description: "Concavity flips downward.",
    state: { a: -0.75, b: 1.5, c: 4, showRoots: true, showVertex: true },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized scene state.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current canvas view as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default quadratic scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Up/Down",
    description: "Increase or decrease coefficient a while the viewport is focused.",
  },
  {
    keys: "Arrow Left/Right",
    description: "Adjust coefficient b while the viewport is focused.",
  },
  {
    keys: "Page Up/Page Down",
    description: "Adjust coefficient c while the viewport is focused.",
  },
  { keys: "R", description: "Reset the scene to the default preset." },
]

export function QuadraticPlotterPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<QuadraticScene>(DEFAULT_QUADRATIC_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard coefficient controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isQuadraticScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the quadratic scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderQuadraticScene(canvas, scene)
  }, [scene])

  const vertex = quadraticVertex(scene)
  const roots = quadraticRoots(scene)
  const metrics = [
    { label: "Discriminant", value: quadraticDiscriminant(scene).toFixed(2) },
    {
      label: "Vertex",
      value: `(${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)})`,
    },
    {
      label: "Roots",
      value: roots.length === 0 ? "No real roots" : roots.map((root) => root.toFixed(2)).join(", "),
    },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(QUADRATIC_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "quadratic-plotter.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_QUADRATIC_SCENE)
        setStatusMessage("Quadratic scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          a: stepNumericValue(current.a, 0.25, (value) => clamp(value, -3, 3)),
        }))
        setStatusMessage("Coefficient a increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          a: stepNumericValue(current.a, -0.25, (value) => clamp(value, -3, 3)),
        }))
        setStatusMessage("Coefficient a decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          b: stepNumericValue(current.b, 0.5, (value) => clamp(value, -6, 6)),
        }))
        setStatusMessage("Coefficient b increased.")
        break
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          b: stepNumericValue(current.b, -0.5, (value) => clamp(value, -6, 6)),
        }))
        setStatusMessage("Coefficient b decreased.")
        break
      case "PageUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          c: stepNumericValue(current.c, 0.5, (value) => clamp(value, -8, 8)),
        }))
        setStatusMessage("Coefficient c increased.")
        break
      case "PageDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          c: stepNumericValue(current.c, -0.5, (value) => clamp(value, -8, 8)),
        }))
        setStatusMessage("Coefficient c decreased.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_QUADRATIC_SCENE)
        setStatusMessage("Quadratic scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Quadratic Plotter"
      description="A Next.js Canvas route for exploring parabola shape, real roots, and the vertex with the same route-local model and renderer split used in Angular Phase 1."
      highlights={[
        "First live Next.js Canvas route in the Visual Math workspace",
        "Shared serialized scene state and export/share actions",
        "Keyboard-driven coefficient tuning inside a focused viewport surface",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Coefficients">
            {RANGE_CONTROLS.map((control) => (
              <WorkbenchRangeControl
                key={control.id}
                control={control}
                value={scene[control.id as keyof Pick<QuadraticScene, "a" | "b" | "c">]}
                displayValue={scene[
                  control.id as keyof Pick<QuadraticScene, "a" | "b" | "c">
                ].toFixed(2)}
                onChange={(nextValue) =>
                  setScene((current) => ({
                    ...current,
                    [control.id]: nextValue,
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
                  scene[control.id as keyof Pick<QuadraticScene, "showRoots" | "showVertex">]
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
            ariaLabel="Quadratic plotter viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current quadratic curve"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{quadraticSummary(scene)}</p>
          <p className="vm-copy">
            This first Phase 4 slice is intentionally aligned with Angular Phase 1 so later Next.js
            Canvas routes can reuse the same workbench contract instead of rebuilding controls and
            state management each time.
          </p>
        </>
      }
    />
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
