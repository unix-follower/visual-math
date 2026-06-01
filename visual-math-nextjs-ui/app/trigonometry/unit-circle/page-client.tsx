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
  DEFAULT_UNIT_CIRCLE_SCENE,
  isUnitCircleScene,
  normalizedAngleDegrees,
  tangentValue,
  type UnitCircleScene,
  unitCircleCoordinates,
  unitCircleSummary,
} from "./unit-circle.model"
import { renderUnitCircleScene } from "./unit-circle.renderer"

const UNIT_CIRCLE_ROUTE_PATH = "/trigonometry/unit-circle"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "angleDegrees",
    label: "Angle",
    min: -180,
    max: 180,
    step: 5,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showProjection", label: "Show projections" },
  { kind: "toggle", id: "showWave", label: "Show sine wave preview" },
]
const PRESETS: readonly WorkbenchPreset<UnitCircleScene>[] = [
  {
    label: "30 degrees",
    description: "Classic special-angle ratio pair.",
    state: { angleDegrees: 30, showProjection: true, showWave: true },
  },
  {
    label: "45 degrees",
    description: "Balanced sine and cosine values.",
    state: { angleDegrees: 45, showProjection: true, showWave: true },
  },
  {
    label: "90 degrees",
    description: "Tangent becomes undefined.",
    state: { angleDegrees: 90, showProjection: true, showWave: true },
  },
  {
    label: "135 degrees",
    description: "Negative cosine in the second quadrant.",
    state: { angleDegrees: 135, showProjection: true, showWave: true },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized trigonometry scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current trigonometry viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default unit-circle scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Rotate the angle in five-degree steps.",
  },
  {
    keys: "Shift + Arrow Left/Right",
    description: "Rotate faster in fifteen-degree steps.",
  },
  { keys: "P", description: "Toggle projection lines." },
  { keys: "W", description: "Toggle the sine wave preview." },
  { keys: "R", description: "Reset the unit-circle scene." },
]

export function UnitCirclePageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<UnitCircleScene>(DEFAULT_UNIT_CIRCLE_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard angle controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isUnitCircleScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the trigonometry scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderUnitCircleScene(canvas, scene)
  }, [scene])

  const coordinates = unitCircleCoordinates(scene)
  const tangent = tangentValue(scene)
  const metrics = [
    { label: "Cosine", value: coordinates.x.toFixed(3) },
    { label: "Sine", value: coordinates.y.toFixed(3) },
    {
      label: "Tangent",
      value: tangent === null ? "Undefined" : tangent.toFixed(3),
    },
    { label: "Angle", value: `${normalizedAngleDegrees(scene).toFixed(0)}°` },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(UNIT_CIRCLE_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "unit-circle.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_UNIT_CIRCLE_SCENE)
        setStatusMessage("Unit-circle scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? 15 : 5

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          angleDegrees: stepNumericValue(current.angleDegrees, -step, clampAngle),
        }))
        setStatusMessage("Angle rotated counterclockwise.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          angleDegrees: stepNumericValue(current.angleDegrees, step, clampAngle),
        }))
        setStatusMessage("Angle rotated clockwise.")
        break
      case "p":
      case "P":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showProjection: !current.showProjection,
        }))
        setStatusMessage("Projection visibility toggled.")
        break
      case "w":
      case "W":
        event.preventDefault()
        setScene((current) => ({ ...current, showWave: !current.showWave }))
        setStatusMessage("Sine-wave preview toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_UNIT_CIRCLE_SCENE)
        setStatusMessage("Unit-circle scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Trigonometry"
      title="Unit Circle"
      description="A Next.js Canvas route pairing unit-circle coordinates with a sine-wave preview so angle, sine, cosine, and tangent stay visually connected."
      highlights={[
        "Fourth live Next.js Canvas route and a new daily-math category",
        "Unit-circle and sine-wave pairing in one shared workbench",
        "Special-angle presets with serialized share and export support",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Angle controls">
            {RANGE_CONTROLS.map((control) => (
              <WorkbenchRangeControl
                key={control.id}
                control={control}
                value={scene.angleDegrees}
                displayValue={`${scene.angleDegrees.toFixed(0)}°`}
                onChange={(nextValue) =>
                  setScene((current) => ({
                    ...current,
                    angleDegrees: nextValue,
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
                  scene[control.id as keyof Pick<UnitCircleScene, "showProjection" | "showWave">]
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
            ariaLabel="Unit circle viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current unit-circle scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{unitCircleSummary(scene)}</p>
          <p className="vm-copy">
            This trigonometry slice adds another daily-math category to Phase 4 while keeping the
            same route-local model and renderer pattern used by the earlier Next.js Canvas pages.
          </p>
        </>
      }
    />
  )
}

function clampAngle(value: number): number {
  return Math.max(-180, Math.min(180, value))
}
