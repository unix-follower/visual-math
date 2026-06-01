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
  DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE,
  gradientMagnitude,
  isPartialDerivativesLabScene,
  partialDerivativeX,
  partialDerivativeY,
  partialDerivativesLabSummary,
  sampleHeight,
  type PartialDerivativesLabScene,
} from "./partial-derivatives-lab.model"
import { renderPartialDerivativesLabScene } from "./partial-derivatives-lab.renderer"

const PARTIAL_DERIVATIVES_LAB_ROUTE_PATH = "/multivariable-calculus/partial-derivatives-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "sampleX",
    label: "Sample x",
    min: -3,
    max: 3,
    step: 0.25,
  },
  {
    kind: "range",
    id: "sampleY",
    label: "Sample y",
    min: -3,
    max: 3,
    step: 0.25,
  },
  {
    kind: "range",
    id: "curvature",
    label: "Curvature",
    min: -1.2,
    max: 1.2,
    step: 0.1,
  },
  {
    kind: "range",
    id: "coupling",
    label: "Coupling",
    min: -1.5,
    max: 1.5,
    step: 0.1,
  },
  { kind: "range", id: "tilt", label: "Tilt", min: -1.5, max: 1.5, step: 0.1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showGradient", label: "Show gradient vector" },
  { kind: "toggle", id: "showContours", label: "Show contour hints" },
]
const PRESETS: readonly WorkbenchPreset<PartialDerivativesLabScene>[] = [
  {
    label: "Gentle bowl",
    description: "Positive curvature with a mild coupling term.",
    state: {
      sampleX: 1,
      sampleY: -1,
      curvature: 0.8,
      coupling: 0.4,
      tilt: 0.6,
      showGradient: true,
      showContours: true,
    },
  },
  {
    label: "Saddle point",
    description: "Negative coupling dominates to create mixed directional behavior.",
    state: {
      sampleX: 0.75,
      sampleY: 0.75,
      curvature: 0.1,
      coupling: -1.1,
      tilt: 0,
      showGradient: true,
      showContours: true,
    },
  },
  {
    label: "Tilted ridge",
    description: "Strong tilt shifts the local gradient direction.",
    state: {
      sampleX: -1.25,
      sampleY: 0.5,
      curvature: 0.6,
      coupling: 0.2,
      tilt: 1.1,
      showGradient: true,
      showContours: true,
    },
  },
  {
    label: "Contours only",
    description: "Hide the gradient and focus on level-set structure.",
    state: {
      sampleX: 1.5,
      sampleY: -0.5,
      curvature: 0.9,
      coupling: 0.5,
      tilt: -0.4,
      showGradient: false,
      showContours: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized multivariable scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current multivariable viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default partial-derivatives scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the sample point along x." },
  { keys: "Arrow Up/Down", description: "Move the sample point along y." },
  { keys: "C / Shift+C", description: "Increase or decrease curvature." },
  { keys: "U / Shift+U", description: "Increase or decrease coupling." },
  { keys: "T / Shift+T", description: "Increase or decrease tilt." },
  { keys: "G", description: "Toggle the gradient vector." },
  { keys: "L", description: "Toggle contour hints." },
  { keys: "R", description: "Reset the multivariable scene." },
]

export function PartialDerivativesLabPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<PartialDerivativesLabScene>(
    DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE,
  )
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard multivariable controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isPartialDerivativesLabScene,
    )

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the multivariable scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderPartialDerivativesLabScene(canvas, scene)
  }, [scene])

  const metrics = [
    { label: "Height", value: sampleHeight(scene).toFixed(2) },
    {
      label: "∂f/∂x",
      value: partialDerivativeX(scene, scene.sampleX, scene.sampleY).toFixed(2),
    },
    {
      label: "∂f/∂y",
      value: partialDerivativeY(scene, scene.sampleX, scene.sampleY).toFixed(2),
    },
    { label: "Gradient |∇f|", value: gradientMagnitude(scene).toFixed(2) },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(PARTIAL_DERIVATIVES_LAB_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "partial-derivatives-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)
        setStatusMessage("Multivariable scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          sampleX: stepNumericValue(current.sampleX, -0.25, (value) => clampDecimal(value, -3, 3)),
        }))
        setStatusMessage("Sample x moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          sampleX: stepNumericValue(current.sampleX, 0.25, (value) => clampDecimal(value, -3, 3)),
        }))
        setStatusMessage("Sample x moved right.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          sampleY: stepNumericValue(current.sampleY, 0.25, (value) => clampDecimal(value, -3, 3)),
        }))
        setStatusMessage("Sample y moved upward.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          sampleY: stepNumericValue(current.sampleY, -0.25, (value) => clampDecimal(value, -3, 3)),
        }))
        setStatusMessage("Sample y moved downward.")
        break
      case "c":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          curvature: stepNumericValue(current.curvature, 0.1, (value) =>
            clampDecimal(value, -1.2, 1.2),
          ),
        }))
        setStatusMessage("Curvature increased.")
        break
      case "C":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          curvature: stepNumericValue(current.curvature, -0.1, (value) =>
            clampDecimal(value, -1.2, 1.2),
          ),
        }))
        setStatusMessage("Curvature decreased.")
        break
      case "u":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          coupling: stepNumericValue(current.coupling, 0.1, (value) =>
            clampDecimal(value, -1.5, 1.5),
          ),
        }))
        setStatusMessage("Coupling increased.")
        break
      case "U":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          coupling: stepNumericValue(current.coupling, -0.1, (value) =>
            clampDecimal(value, -1.5, 1.5),
          ),
        }))
        setStatusMessage("Coupling decreased.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          tilt: stepNumericValue(current.tilt, 0.1, (value) => clampDecimal(value, -1.5, 1.5)),
        }))
        setStatusMessage("Tilt increased.")
        break
      case "T":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          tilt: stepNumericValue(current.tilt, -0.1, (value) => clampDecimal(value, -1.5, 1.5)),
        }))
        setStatusMessage("Tilt decreased.")
        break
      case "g":
      case "G":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showGradient: !current.showGradient,
        }))
        setStatusMessage("Gradient vector toggled.")
        break
      case "l":
      case "L":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showContours: !current.showContours,
        }))
        setStatusMessage("Contour hints toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_PARTIAL_DERIVATIVES_LAB_SCENE)
        setStatusMessage("Multivariable scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Partial Derivatives Lab"
      description="A Next.js Canvas route for exploring local surface height, partial derivatives, and gradient direction on a 2D multivariable heatmap."
      highlights={[
        "Weekly multivariable calculus slice built on the unchanged shared workbench shell",
        "Heatmap plus contour hints instead of a purely 3D surface treatment",
        "Gradient and partial-derivative intuition with the same share, reset, export, and keyboard contract",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Surface setup">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    PartialDerivativesLabScene,
                    "sampleX" | "sampleY" | "curvature" | "coupling" | "tilt"
                  >
                ]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]: nextValue,
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
                      PartialDerivativesLabScene,
                      "showGradient" | "showContours"
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
            ariaLabel="Partial derivatives lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current multivariable scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{partialDerivativesLabSummary(scene)}</p>
          <p className="vm-copy">
            This route extends Phase 4 beyond single-variable calculus by showing how local slope
            splits into separate x and y components on the same route-local model and renderer
            structure used across the other Next.js Canvas slices.
          </p>
        </>
      }
    />
  )
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
