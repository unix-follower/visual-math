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
  averageApproximation,
  DEFAULT_LIMITS_LAB_SCENE,
  limitValue,
  limitsLabSummary,
  isLimitsLabScene,
  leftHandValue,
  rightHandValue,
  type LimitsLabScene,
} from "./limits-lab.model"
import { renderLimitsLabScene } from "./limits-lab.renderer"

const LIMITS_LAB_ROUTE_PATH = "/calculus/limits-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "targetX",
    label: "Target x",
    min: -2,
    max: 2,
    step: 0.25,
  },
  {
    kind: "range",
    id: "frequency",
    label: "Frequency",
    min: 0.5,
    max: 3,
    step: 0.25,
  },
  {
    kind: "range",
    id: "windowRadius",
    label: "Window radius",
    min: 0.1,
    max: 1.5,
    step: 0.05,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showSamples", label: "Show left/right sample points" },
  { kind: "toggle", id: "showLimitGuide", label: "Show limit guide" },
]
const PRESETS: readonly WorkbenchPreset<LimitsLabScene>[] = [
  {
    label: "Centered sinc",
    description: "Classic removable discontinuity centered at the origin.",
    state: {
      targetX: 0,
      frequency: 1,
      windowRadius: 0.4,
      showSamples: true,
      showLimitGuide: true,
    },
  },
  {
    label: "Shifted target",
    description: "Move the limit point away from the origin.",
    state: {
      targetX: 1.25,
      frequency: 1.5,
      windowRadius: 0.35,
      showSamples: true,
      showLimitGuide: true,
    },
  },
  {
    label: "Tighter window",
    description: "Shrink the left/right interval to tighten the approximation.",
    state: {
      targetX: -0.75,
      frequency: 2,
      windowRadius: 0.15,
      showSamples: true,
      showLimitGuide: true,
    },
  },
  {
    label: "Guide only",
    description: "Hide sample markers and focus on the removable hole and limit line.",
    state: {
      targetX: 0.5,
      frequency: 2.5,
      windowRadius: 0.4,
      showSamples: false,
      showLimitGuide: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized limits scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current limits viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default limits scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "Arrow Left/Right", description: "Move the target x-value." },
  { keys: "Arrow Up/Down", description: "Increase or decrease the frequency." },
  {
    keys: "W / Shift+W",
    description: "Increase or decrease the sampling window radius.",
  },
  { keys: "S", description: "Toggle left/right sample markers." },
  { keys: "G", description: "Toggle the limit guide." },
  { keys: "R", description: "Reset the limits scene." },
]

export function LimitsLabPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<LimitsLabScene>(DEFAULT_LIMITS_LAB_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the graph area for keyboard limits controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isLimitsLabScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the limits scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderLimitsLabScene(canvas, scene)
  }, [scene])

  const metrics = [
    { label: "Left-hand value", value: leftHandValue(scene).toFixed(3) },
    { label: "Right-hand value", value: rightHandValue(scene).toFixed(3) },
    {
      label: "Average estimate",
      value: averageApproximation(scene).toFixed(3),
    },
    { label: "Limit", value: limitValue(scene).toFixed(3) },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(LIMITS_LAB_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "limits-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_LIMITS_LAB_SCENE)
        setStatusMessage("Limits scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          targetX: stepNumericValue(current.targetX, -0.25, (value) => clampDecimal(value, -2, 2)),
        }))
        setStatusMessage("Target x decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          targetX: stepNumericValue(current.targetX, 0.25, (value) => clampDecimal(value, -2, 2)),
        }))
        setStatusMessage("Target x increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          frequency: stepNumericValue(current.frequency, 0.25, (value) =>
            clampDecimal(value, 0.5, 3),
          ),
        }))
        setStatusMessage("Frequency increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          frequency: stepNumericValue(current.frequency, -0.25, (value) =>
            clampDecimal(value, 0.5, 3),
          ),
        }))
        setStatusMessage("Frequency decreased.")
        break
      case "w":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          windowRadius: stepNumericValue(current.windowRadius, 0.05, (value) =>
            clampDecimal(value, 0.1, 1.5),
          ),
        }))
        setStatusMessage("Window radius increased.")
        break
      case "W":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          windowRadius: stepNumericValue(current.windowRadius, -0.05, (value) =>
            clampDecimal(value, 0.1, 1.5),
          ),
        }))
        setStatusMessage("Window radius decreased.")
        break
      case "s":
      case "S":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showSamples: !current.showSamples,
        }))
        setStatusMessage("Sample markers toggled.")
        break
      case "g":
      case "G":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showLimitGuide: !current.showLimitGuide,
        }))
        setStatusMessage("Limit guide toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_LIMITS_LAB_SCENE)
        setStatusMessage("Limits scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Limits Lab"
      description="A Next.js Canvas route for building left-hand, right-hand, and removable-discontinuity intuition around a movable sinc-style limit."
      highlights={[
        "Third weekly calculus slice using the unchanged shared workbench shell",
        "Left-hand and right-hand approximations around a removable hole",
        "Route-local model and renderer with the same share, reset, export, and keyboard contract",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Limit setup">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<LimitsLabScene, "targetX" | "frequency" | "windowRadius">
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
                  scene[control.id as keyof Pick<LimitsLabScene, "showSamples" | "showLimitGuide">]
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
            ariaLabel="Limits lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current limits scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{limitsLabSummary(scene)}</p>
          <p className="vm-copy">
            This route extends the calculus lane with a removable discontinuity view so the weekly
            surfaces now cover slope, accumulated area, and approach behavior without changing the
            shared Next.js workbench.
          </p>
        </>
      }
    />
  )
}

function clampDecimal(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2))
}
