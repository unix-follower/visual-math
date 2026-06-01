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
  DEFAULT_SAMPLING_LAB_SCENE,
  isSamplingLabScene,
  samplingLabSummary,
  simulateSamplingLab,
  type SamplingLabScene,
} from "./sampling-lab.model"
import { renderSamplingLabScene } from "./sampling-lab.renderer"

const SAMPLING_LAB_ROUTE_PATH = "/statistics-probability/sampling-lab"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
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
    id: "trialsPerExperiment",
    label: "Trials per experiment",
    min: 2,
    max: 20,
    step: 1,
  },
  {
    kind: "range",
    id: "experimentCount",
    label: "Experiment count",
    min: 20,
    max: 200,
    step: 10,
  },
  { kind: "range", id: "seed", label: "Seed", min: 1, max: 99, step: 1 },
]
const TOGGLE_CONTROLS: readonly ToggleControlSchema[] = [
  { kind: "toggle", id: "showExpectedValue", label: "Show expected value" },
  { kind: "toggle", id: "showEmpiricalMean", label: "Show empirical mean" },
]
const PRESETS: readonly WorkbenchPreset<SamplingLabScene>[] = [
  {
    label: "Fair coin",
    description: "Balanced binomial experiments with p = 0.50.",
    state: {
      successProbability: 0.5,
      trialsPerExperiment: 10,
      experimentCount: 60,
      seed: 17,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
  {
    label: "Rare event",
    description: "Low-probability successes with many trials.",
    state: {
      successProbability: 0.15,
      trialsPerExperiment: 18,
      experimentCount: 90,
      seed: 11,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
  {
    label: "Biased coin",
    description: "Moderately skewed success probability.",
    state: {
      successProbability: 0.7,
      trialsPerExperiment: 12,
      experimentCount: 80,
      seed: 29,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
  {
    label: "Compact sample",
    description: "Smaller sample to show noisier empirical behavior.",
    state: {
      successProbability: 0.4,
      trialsPerExperiment: 8,
      experimentCount: 30,
      seed: 7,
      showExpectedValue: true,
      showEmpiricalMean: true,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized sampling scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current statistics viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default sampling scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  {
    keys: "Arrow Left/Right",
    description: "Decrease or increase the success probability.",
  },
  {
    keys: "Arrow Up/Down",
    description: "Increase or decrease the experiment count.",
  },
  {
    keys: "T / Shift+T",
    description: "Increase or decrease trials per experiment.",
  },
  { keys: "E", description: "Toggle the expected-value guide." },
  { keys: "M", description: "Toggle the empirical-mean guide." },
  { keys: "R", description: "Reset the sampling scene." },
]

export function SamplingLabPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scene, setScene] = useState<SamplingLabScene>(DEFAULT_SAMPLING_LAB_SCENE)
  const [statusMessage, setStatusMessage] = useState(
    "Focus the histogram area for keyboard probability controls.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isSamplingLabScene)

    if (initialScene) {
      setScene(initialScene)
      setStatusMessage("Loaded the sampling scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  const derivedMetrics = simulateSamplingLab(scene)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderSamplingLabScene(canvas, scene, derivedMetrics)
  }, [derivedMetrics, scene])

  const metrics = [
    {
      label: "Expected value",
      value: derivedMetrics.theoreticalMean.toFixed(2),
    },
    { label: "Empirical mean", value: derivedMetrics.empiricalMean.toFixed(2) },
    { label: "Trials", value: `${scene.trialsPerExperiment}` },
    { label: "Experiments", value: `${scene.experimentCount}` },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(SAMPLING_LAB_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "sampling-lab.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_SAMPLING_LAB_SCENE)
        setStatusMessage("Sampling scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          successProbability: stepNumericValue(current.successProbability, -0.05, clampProbability),
        }))
        setStatusMessage("Success probability decreased.")
        break
      case "ArrowRight":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          successProbability: stepNumericValue(current.successProbability, 0.05, clampProbability),
        }))
        setStatusMessage("Success probability increased.")
        break
      case "ArrowUp":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          experimentCount: stepNumericValue(current.experimentCount, 10, (value) =>
            clampInteger(value, 20, 200),
          ),
        }))
        setStatusMessage("Experiment count increased.")
        break
      case "ArrowDown":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          experimentCount: stepNumericValue(current.experimentCount, -10, (value) =>
            clampInteger(value, 20, 200),
          ),
        }))
        setStatusMessage("Experiment count decreased.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          trialsPerExperiment: stepNumericValue(current.trialsPerExperiment, 1, (value) =>
            clampInteger(value, 2, 20),
          ),
        }))
        setStatusMessage("Trials per experiment increased.")
        break
      case "T":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          trialsPerExperiment: stepNumericValue(current.trialsPerExperiment, -1, (value) =>
            clampInteger(value, 2, 20),
          ),
        }))
        setStatusMessage("Trials per experiment decreased.")
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
      case "m":
      case "M":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          showEmpiricalMean: !current.showEmpiricalMean,
        }))
        setStatusMessage("Empirical-mean guide toggled.")
        break
      case "r":
      case "R":
        event.preventDefault()
        setScene(DEFAULT_SAMPLING_LAB_SCENE)
        setStatusMessage("Sampling scene reset from the keyboard.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 4"
      title="Sampling Lab"
      description="A Next.js Canvas route for exploring deterministic Bernoulli experiments, empirical sampling behavior, and the gap between expected and measured means."
      highlights={[
        "Daily-math statistics and probability slice built on the shared React workbench",
        "Deterministic seeded experiments so presets and share links stay stable",
        "Histogram plus expected-versus-empirical guide lines without new shared UI infrastructure",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Experiment setup">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    SamplingLabScene,
                    "successProbability" | "trialsPerExperiment" | "experimentCount" | "seed"
                  >
                ]
              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "successProbability"
                      ? Number(value).toFixed(2)
                      : `${Math.round(Number(value))}`
                  }
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]:
                        control.id === "successProbability" ? nextValue : Math.round(nextValue),
                    }))
                  }
                />
              )
            })}
          </WorkbenchControlSection>

          <WorkbenchControlSection heading="Guides">
            {TOGGLE_CONTROLS.map((control) => (
              <WorkbenchToggleControl
                key={control.id}
                control={control}
                checked={
                  scene[
                    control.id as keyof Pick<
                      SamplingLabScene,
                      "showExpectedValue" | "showEmpiricalMean"
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
            ariaLabel="Sampling lab viewport"
            onKeyDown={handleViewportKeydown}
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={480}
              className="vm-canvas"
              aria-label="Canvas showing the current sampling histogram"
            />
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">{samplingLabSummary(scene, derivedMetrics)}</p>
          <p className="vm-copy">
            This Phase 4 slice extends the shared workbench into statistics and probability using
            the same route-local model, renderer, preset, and keyboard interaction pattern already
            established in the existing Next.js Canvas routes.
          </p>
        </>
      }
    />
  )
}

function clampProbability(value: number): number {
  return Math.max(0.05, Math.min(0.95, Number(value.toFixed(2))))
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}
