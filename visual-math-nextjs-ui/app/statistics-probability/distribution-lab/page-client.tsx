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
  clampHighlightedOutcome,
  DEFAULT_DISTRIBUTION_LAB_SCENE,
  distributionLabMetrics,
  distributionLabSummary,
  isDistributionLabScene,
  type DistributionLabScene,
} from "./distribution-lab.model"
import { renderDistributionLabScene } from "./distribution-lab.renderer"

const DISTRIBUTION_LAB_ROUTE_PATH = "/statistics-probability/distribution-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "trialCount",
    label: "Trials",
    min: 2,
    max: 16,
    step: 1,
  },
  {
    kind: "range",
    id: "successProbability",
    label: "Success probability",
    min: 0.05,
    max: 0.95,
    step: 0.05,
  },
  {
    kind: "range",
    id: "highlightedOutcome",
    label: "Highlighted outcome",
    min: 0,
    max: 16,
    step: 1,
  },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  {
    kind: "toggle",
    id: "showExpectedValue",
    label: "Show expected value guide",
  },
  {
    kind: "toggle",
    id: "showCumulativeProbability",
    label: "Show cumulative probability shading",
  },
]
const PRESETS: readonly WorkbenchPreset<DistributionLabScene>[] = [
  {
    label: "Fair coin",
    description: "Balanced eight-trial binomial distribution centered near four successes.",
    state: {
      trialCount: 8,
      successProbability: 0.5,
      highlightedOutcome: 4,
      showExpectedValue: true,
      showCumulativeProbability: true,
    },
  },
  {
    label: "Rare success",
    description: "Low-probability outcomes concentrated near zero.",
    state: {
      trialCount: 12,
      successProbability: 0.2,
      highlightedOutcome: 2,
      showExpectedValue: true,
      showCumulativeProbability: true,
    },
  },
  {
    label: "High success",
    description: "Mass shifts toward many successes as p increases.",
    state: {
      trialCount: 10,
      successProbability: 0.75,
      highlightedOutcome: 8,
      showExpectedValue: true,
      showCumulativeProbability: true,
    },
  },
  {
    label: "Guide focus",
    description: "Hide cumulative shading to focus on exact point probabilities.",
    state: {
      trialCount: 14,
      successProbability: 0.4,
      highlightedOutcome: 5,
      showExpectedValue: true,
      showCumulativeProbability: false,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized distribution scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current probability viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default distribution scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Move the highlighted exact outcome.",
  },
  {
    keys: "Arrow Up/Down",
    description: "Increase or decrease the success probability.",
  },
  {
    keys: "T / Shift+T",
    description: "Increase or decrease the number of trials.",
  },
  { keys: "E", description: "Toggle the expected-value guide." },
  { keys: "C", description: "Toggle cumulative shading." },
  { keys: "R", description: "Reset the distribution scene." },
]

export function DistributionLabPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<DistributionLabScene>(DEFAULT_DISTRIBUTION_LAB_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the distribution area for keyboard probability controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isDistributionLabScene)

    if (initialScene) {
      setScene({
        ...initialScene,
        highlightedOutcome: clampHighlightedOutcome(
          initialScene.highlightedOutcome,
          initialScene.trialCount,
        ),
      })
      setStatusMessage("Loaded the distribution scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  const derivedMetrics = distributionLabMetrics(scene)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderDistributionLabScene(canvas, scene, derivedMetrics)
  }, [derivedMetrics, scene])

  const metrics = [
    {
      label: "P(X = k)",
      value: derivedMetrics.highlightedProbability.toFixed(3),
    },
    {
      label: "P(X <= k)",
      value: derivedMetrics.cumulativeProbability.toFixed(3),
    },
    { label: "Expected value", value: derivedMetrics.expectedValue.toFixed(2) },
    { label: "Variance", value: derivedMetrics.variance.toFixed(2) },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(DISTRIBUTION_LAB_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "distribution-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_DISTRIBUTION_LAB_SCENE)
        setStatusMessage("Distribution scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          highlightedOutcome: stepNumericValue(current.highlightedOutcome, -1, (value) =>
            clampHighlightedOutcome(value, current.trialCount),
          ),
        }))
        setStatusMessage("Highlighted outcome moved left.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          highlightedOutcome: stepNumericValue(current.highlightedOutcome, 1, (value) =>
            clampHighlightedOutcome(value, current.trialCount),
          ),
        }))
        setStatusMessage("Highlighted outcome moved right.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          successProbability: stepNumericValue(current.successProbability, 0.05, clampProbability),
        }))
        setStatusMessage("Success probability increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          successProbability: stepNumericValue(current.successProbability, -0.05, clampProbability),
        }))
        setStatusMessage("Success probability decreased.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => {
          const trialCount = stepNumericValue(current.trialCount, 1, (value) =>
            clampInteger(value, 2, 16),
          )

          return {
            ...current,
            trialCount,
            highlightedOutcome: clampHighlightedOutcome(current.highlightedOutcome, trialCount),
          }
        })
        setStatusMessage("Trial count increased.")
        break
      case "T":
        event.preventDefault()
        setScene((current) => {
          const trialCount = stepNumericValue(current.trialCount, -1, (value) =>
            clampInteger(value, 2, 16),
          )

          return {
            ...current,
            trialCount,
            highlightedOutcome: clampHighlightedOutcome(current.highlightedOutcome, trialCount),
          }
        })
        setStatusMessage("Trial count decreased.")
        break
      case "e":
      case "E":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showExpectedValue: !current.showExpectedValue,
        }))
        setStatusMessage("Expected-value guide toggled.")
        break
      case "c":
      case "C":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showCumulativeProbability: !current.showCumulativeProbability,
        }))
        setStatusMessage("Cumulative shading toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_DISTRIBUTION_LAB_SCENE)
        setStatusMessage("Distribution scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Distribution Lab"
      description="A Next.js Canvas route for exact binomial distributions, highlighted point probabilities, and cumulative probability intuition on the shared probability workbench."
      highlights={[
        "Weekly probability slice built without extending the shared workbench API",
        "Exact binomial bars instead of sampled histograms",
        "Expected-value guide and cumulative shading on the same route-local renderer split",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Distribution setup">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    DistributionLabScene,
                    "trialCount" | "successProbability" | "highlightedOutcome"
                  >
                ]
              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "highlightedOutcome"
                      ? `${Math.round(value)} of ${scene.trialCount}`
                      : control.id === "trialCount"
                        ? `${Math.round(value)}`
                        : value.toFixed(2)
                  }
                  onChange={(nextValue) =>
                    setScene((current) => {
                      if (control.id === "trialCount") {
                        const trialCount = clampInteger(nextValue, 2, 16)
                        return {
                          ...current,
                          trialCount,
                          highlightedOutcome: clampHighlightedOutcome(
                            current.highlightedOutcome,
                            trialCount,
                          ),
                        }
                      }

                      if (control.id === "highlightedOutcome") {
                        return {
                          ...current,
                          highlightedOutcome: clampHighlightedOutcome(
                            nextValue,
                            current.trialCount,
                          ),
                        }
                      }

                      return {
                        ...current,
                        successProbability: clampProbability(nextValue),
                      }
                    })
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
                      DistributionLabScene,
                      "showExpectedValue" | "showCumulativeProbability"
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
            ariaLabel="Distribution lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current distribution scene"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{distributionLabSummary(scene, derivedMetrics)}</p>
          <p className="vm-copy">
            This route extends Phase 4 statistics from simulated experiments to exact outcome
            probabilities, keeping the same route-local model and renderer split as Sampling Lab
            while adding a weekly probability surface.
          </p>
        </>
      }
    />
  )
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function clampProbability(value: number): number {
  return Number(Math.max(0.05, Math.min(0.95, value)).toFixed(2))
}
