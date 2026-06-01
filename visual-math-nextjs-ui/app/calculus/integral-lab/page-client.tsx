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
  DEFAULT_INTEGRAL_LAB_SCENE,
  exactIntegralArea,
  integralLabSummary,
  isIntegralLabScene,
  leftRiemannSum,
  midpointRiemannSum,
  type IntegralLabScene,
} from "./integral-lab.model"
import { renderIntegralLabScene } from "./integral-lab.renderer"

const INTEGRAL_LAB_ROUTE_PATH = "/calculus/integral-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "upperBound",
    label: "Upper bound",
    min: 1,
    max: 6.25,
    step: 0.25,
  },
  {
    kind: "range",
    id: "waveAmplitude",
    label: "Wave amplitude",
    min: 0,
    max: 0.9,
    step: 0.05,
  },
  {
    kind: "range",
    id: "subdivisionCount",
    label: "Subdivisions",
    min: 2,
    max: 24,
    step: 1,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showRectangles", label: "Show midpoint rectangles" },
  { kind: "toggle", id: "showExactArea", label: "Show exact area fill" },
]
const PRESETS: readonly WorkbenchPreset<IntegralLabScene>[] = [
  {
    label: "Short interval",
    description: "A compact accumulation window with visible midpoint rectangles.",
    state: {
      upperBound: 2.5,
      waveAmplitude: 0.4,
      subdivisionCount: 6,
      showRectangles: true,
      showExactArea: true,
    },
  },
  {
    label: "Wide interval",
    description: "Longer accumulation up to nearly one full sine cycle.",
    state: {
      upperBound: 5.75,
      waveAmplitude: 0.55,
      subdivisionCount: 12,
      showRectangles: true,
      showExactArea: true,
    },
  },
  {
    label: "High contrast",
    description: "Larger oscillation to emphasize approximation error.",
    state: {
      upperBound: 4.75,
      waveAmplitude: 0.85,
      subdivisionCount: 8,
      showRectangles: true,
      showExactArea: true,
    },
  },
  {
    label: "Area only",
    description: "Turn off rectangles to isolate the exact accumulated region.",
    state: {
      upperBound: 4,
      waveAmplitude: 0.6,
      subdivisionCount: 10,
      showRectangles: false,
      showExactArea: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized integral scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current integral viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default integral scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Decrease or increase the upper bound.",
  },
  {
    keys: "Arrow Up/Down",
    description: "Increase or decrease subdivision count.",
  },
  {
    keys: "W / Shift+W",
    description: "Increase or decrease the wave amplitude.",
  },
  { keys: "M", description: "Toggle midpoint rectangles." },
  { keys: "G", description: "Toggle exact area shading." },
  { keys: "R", description: "Reset the integral scene." },
]

export function IntegralLabPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<IntegralLabScene>(DEFAULT_INTEGRAL_LAB_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard integral controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isIntegralLabScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the integral scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderIntegralLabScene(canvas, scene)
  }, [scene])

  const metrics = [
    { label: "Exact area", value: exactIntegralArea(scene).toFixed(2) },
    { label: "Midpoint sum", value: midpointRiemannSum(scene).toFixed(2) },
    { label: "Left sum", value: leftRiemannSum(scene).toFixed(2) },
    {
      label: "Δx",
      value: (scene.upperBound / scene.subdivisionCount).toFixed(2),
    },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(INTEGRAL_LAB_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "integral-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_INTEGRAL_LAB_SCENE)
        setStatusMessage("Integral scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          upperBound: stepNumericValue(current.upperBound, -0.25, (value) =>
            clampDecimal(value, 1, 6.25),
          ),
        }))
        setStatusMessage("Upper bound decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          upperBound: stepNumericValue(current.upperBound, 0.25, (value) =>
            clampDecimal(value, 1, 6.25),
          ),
        }))
        setStatusMessage("Upper bound increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          subdivisionCount: stepNumericValue(current.subdivisionCount, 1, (value) =>
            clampInteger(value, 2, 24),
          ),
        }))
        setStatusMessage("Subdivision count increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          subdivisionCount: stepNumericValue(current.subdivisionCount, -1, (value) =>
            clampInteger(value, 2, 24),
          ),
        }))
        setStatusMessage("Subdivision count decreased.")
        break
      case "w":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          waveAmplitude: stepNumericValue(current.waveAmplitude, 0.05, (value) =>
            clampDecimal(value, 0, 0.9),
          ),
        }))
        setStatusMessage("Wave amplitude increased.")
        break
      case "W":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          waveAmplitude: stepNumericValue(current.waveAmplitude, -0.05, (value) =>
            clampDecimal(value, 0, 0.9),
          ),
        }))
        setStatusMessage("Wave amplitude decreased.")
        break
      case "m":
      case "M":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showRectangles: !current.showRectangles,
        }))
        setStatusMessage("Midpoint rectangles toggled.")
        break
      case "g":
      case "G":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showExactArea: !current.showExactArea,
        }))
        setStatusMessage("Exact area fill toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_INTEGRAL_LAB_SCENE)
        setStatusMessage("Integral scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Integral Lab"
      description="A Next.js Canvas route for comparing exact accumulated area against midpoint and left Riemann estimates across a configurable interval."
      highlights={[
        "Second weekly calculus slice built on the existing shared React workbench",
        "Exact-versus-estimated accumulation without widening the shared UI surface",
        "Keyboard-driven interval, subdivision, and amplitude controls inside a focused viewport",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Integral setup">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    IntegralLabScene,
                    "upperBound" | "waveAmplitude" | "subdivisionCount"
                  >
                ]
              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "subdivisionCount" ? `${Math.round(value)}` : value.toFixed(2)
                  }
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]:
                        control.id === "subdivisionCount" ? Math.round(nextValue) : nextValue,
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
                    control.id as keyof Pick<IntegralLabScene, "showRectangles" | "showExactArea">
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
            ariaLabel="Integral lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current integral scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{integralLabSummary(scene)}</p>
          <p className="vm-copy">
            This route extends the Phase 4 calculus lane by pairing exact area accumulation with
            midpoint and left-sum approximations under the same route-local model and renderer split
            already used by the other Next.js Canvas routes.
          </p>
        </>
      }
    />
  )
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}
