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
  DEFAULT_DERIVATIVE_LAB_SCENE,
  derivativeAt,
  derivativeLabSummary,
  evaluateDerivativeLabCurve,
  isDerivativeLabScene,
  secantSlope,
  type DerivativeLabScene,
} from "./derivative-lab.model"
import { renderDerivativeLabScene } from "./derivative-lab.renderer"

const DERIVATIVE_LAB_ROUTE_PATH = "/calculus/derivative-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "pointX",
    label: "Point x",
    min: -4,
    max: 4,
    step: 0.25,
  },
  {
    kind: "range",
    id: "curvature",
    label: "Curvature",
    min: -1.5,
    max: 1.5,
    step: 0.1,
  },
  {
    kind: "range",
    id: "linearTerm",
    label: "Linear term",
    min: -3,
    max: 3,
    step: 0.25,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showTangent", label: "Show tangent line" },
  { kind: "toggle", id: "showSecant", label: "Show secant line" },
]
const PRESETS: readonly WorkbenchPreset<DerivativeLabScene>[] = [
  {
    label: "Balanced parabola",
    description: "Smooth positive curvature with both reference lines.",
    state: {
      pointX: 1.5,
      curvature: 0.8,
      linearTerm: -0.5,
      showTangent: true,
      showSecant: true,
    },
  },
  {
    label: "Steep tangent",
    description: "Higher curvature and a point to the right of the vertex.",
    state: {
      pointX: 2.25,
      curvature: 1.2,
      linearTerm: -1,
      showTangent: true,
      showSecant: true,
    },
  },
  {
    label: "Descending section",
    description: "Negative local slope to contrast tangent and secant.",
    state: {
      pointX: -1.5,
      curvature: 0.7,
      linearTerm: 0.4,
      showTangent: true,
      showSecant: true,
    },
  },
  {
    label: "Concave down",
    description: "Negative curvature to flip the curve.",
    state: {
      pointX: 0.75,
      curvature: -0.9,
      linearTerm: 0.75,
      showTangent: true,
      showSecant: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized calculus scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current calculus viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default derivative scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Move the tangent point left or right.",
  },
  {
    keys: "Arrow Up/Down",
    description: "Increase or decrease curve curvature.",
  },
  { keys: "L / Shift+L", description: "Increase or decrease the linear term." },
  { keys: "T", description: "Toggle the tangent line." },
  { keys: "S", description: "Toggle the secant line." },
  { keys: "R", description: "Reset the derivative scene." },
]

export function DerivativeLabPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<DerivativeLabScene>(DEFAULT_DERIVATIVE_LAB_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard calculus controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isDerivativeLabScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the derivative scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderDerivativeLabScene(canvas, scene)
  }, [scene])

  const metrics = [
    {
      label: "f(x)",
      value: evaluateDerivativeLabCurve(scene, scene.pointX).toFixed(2),
    },
    { label: "f'(x)", value: derivativeAt(scene, scene.pointX).toFixed(2) },
    {
      label: "Secant slope",
      value: secantSlope(scene, scene.pointX).toFixed(2),
    },
    { label: "x value", value: scene.pointX.toFixed(2) },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(DERIVATIVE_LAB_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "derivative-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_DERIVATIVE_LAB_SCENE)
        setStatusMessage("Derivative scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          pointX: stepNumericValue(current.pointX, -0.25, (value) => clampDecimal(value, -4, 4)),
        }))
        setStatusMessage("Tangent point moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          pointX: stepNumericValue(current.pointX, 0.25, (value) => clampDecimal(value, -4, 4)),
        }))
        setStatusMessage("Tangent point moved right.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          curvature: stepNumericValue(current.curvature, 0.1, (value) =>
            clampDecimal(value, -1.5, 1.5),
          ),
        }))
        setStatusMessage("Curvature increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          curvature: stepNumericValue(current.curvature, -0.1, (value) =>
            clampDecimal(value, -1.5, 1.5),
          ),
        }))
        setStatusMessage("Curvature decreased.")
        break
      case "l":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          linearTerm: stepNumericValue(current.linearTerm, 0.25, (value) =>
            clampDecimal(value, -3, 3),
          ),
        }))
        setStatusMessage("Linear term increased.")
        break
      case "L":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          linearTerm: stepNumericValue(current.linearTerm, -0.25, (value) =>
            clampDecimal(value, -3, 3),
          ),
        }))
        setStatusMessage("Linear term decreased.")
        break
      case "t":
      case "T":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showTangent: !current.showTangent,
        }))
        setStatusMessage("Tangent line toggled.")
        break
      case "s":
      case "S":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showSecant: !current.showSecant,
        }))
        setStatusMessage("Secant line toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_DERIVATIVE_LAB_SCENE)
        setStatusMessage("Derivative scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Calculus"
      title="Derivative Lab"
      description="A Next.js Canvas route for comparing tangent and secant slopes on a quadratic curve using the shared Phase 4 workbench surface."
      highlights={[
        "Second live Next.js Canvas route and the first weekly-math slice",
        "Tangent and secant comparison on one interactive curve",
        "Reuses the same route-local model and renderer split as the Angular calculus slice",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Curve controls">
            {RANGE_CONTROLS.map((control) => (
              <WorkbenchRangeControl
                key={control.id}
                control={control}
                value={
                  scene[
                    control.id as keyof Pick<
                      DerivativeLabScene,
                      "pointX" | "curvature" | "linearTerm"
                    >
                  ]
                }
                displayValue={scene[
                  control.id as keyof Pick<
                    DerivativeLabScene,
                    "pointX" | "curvature" | "linearTerm"
                  >
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

          <WorkbenchControlSection heading="Display options">
            {TOGGLE_CONTROLS.map((control) => (
              <WorkbenchToggleControl
                key={control.id}
                control={control}
                checked={
                  scene[control.id as keyof Pick<DerivativeLabScene, "showTangent" | "showSecant">]
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
            ariaLabel="Derivative lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current derivative lab curve"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{derivativeLabSummary(scene)}</p>
          <p className="vm-copy">
            This weekly-math slice extends the same Phase 4 workbench used by Quadratic Plotter,
            which keeps the route-local rendering code small while preserving shared
            share/export/reset behavior.
          </p>
        </>
      }
    />
  )
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
