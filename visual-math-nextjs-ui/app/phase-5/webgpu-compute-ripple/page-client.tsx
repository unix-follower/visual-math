"use client"

import { useEffect, useRef, useState } from "react"

import {
  MathWorkbench,
  WorkbenchControlSection,
  WorkbenchMetricGrid,
  WorkbenchPresetGrid,
  WorkbenchRangeControl,
  WorkbenchViewportSurface,
} from "@/app/shared/workbench/workbench"
import { stepNumericValue } from "@/app/shared/workbench/workbench-keyboard"
import type {
  RangeControlSchema,
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
  hasWebGpuSupport,
  initializeWebGpuCanvas,
  type WebGpuCanvasRuntime,
} from "@/app/shared/webgpu/webgpu-bootstrap"

import {
  computeRippleAccentColor,
  computeRippleClearColor,
  computeRippleStageLabel,
  DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE,
  isWebGpuComputeRippleScene,
  type WebGpuComputeRippleScene,
  webGpuComputeRippleSummary,
} from "./webgpu-compute-ripple.model"
import {
  releaseWebGpuComputeRippleResources,
  renderWebGpuComputeRippleScene,
} from "./webgpu-compute-ripple.renderer"

const ROUTE_PATH = "/phase-5/webgpu-compute-ripple"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  {
    kind: "range",
    id: "red",
    label: "Red channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "green",
    label: "Green channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "blue",
    label: "Blue channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "alpha",
    label: "Alpha channel",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "amplitude",
    label: "Amplitude",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "frequency",
    label: "Frequency",
    min: 0,
    max: 1,
    step: 0.01,
  },
  { kind: "range", id: "drift", label: "Drift", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuComputeRippleScene>[] = [
  {
    label: "Balanced ripple",
    description: "Default compute ripple with moderate amplitude and drift.",
    state: {
      red: 0.07,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      amplitude: 0.56,
      frequency: 0.62,
      drift: 0.34,
    },
  },
  {
    label: "High energy",
    description: "Stronger amplitude and frequency for a more dramatic compute-written triangle.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.16,
      alpha: 1,
      amplitude: 0.88,
      frequency: 0.86,
      drift: 0.52,
    },
  },
  {
    label: "Cool drift",
    description: "Lower amplitude with higher drift for a calmer but offset ripple pattern.",
    state: {
      red: 0.1,
      green: 0.14,
      blue: 0.24,
      alpha: 0.84,
      amplitude: 0.28,
      frequency: 0.38,
      drift: 0.78,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized compute-ripple scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current compute-ripple viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default compute-ripple scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  {
    keys: "G / Shift+G",
    description: "Increase or decrease the green channel.",
  },
  {
    keys: "B / Shift+B",
    description: "Increase or decrease the blue channel.",
  },
  {
    keys: "A / Shift+A",
    description: "Increase or decrease the alpha channel.",
  },
  {
    keys: "M / Shift+M",
    description: "Increase or decrease the ripple amplitude.",
  },
  {
    keys: "F / Shift+F",
    description: "Increase or decrease the ripple frequency.",
  },
  { keys: "D / Shift+D", description: "Increase or decrease the drift." },
  { keys: "Escape", description: "Reset to the default compute-ripple scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuComputeRipplePageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuComputeRippleScene>(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the compute-ripple route checks browser support and prepares a compute-plus-render pipeline pair.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuComputeRippleScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        amplitude: clampChannel(initialScene.amplitude),
        frequency: clampChannel(initialScene.frequency),
        drift: clampChannel(initialScene.drift),
      })
      setStatusMessage("Loaded the compute-ripple scene from the shared URL.")
    }

    setHasLoadedSearchState(true)
  }, [hasLoadedSearchState, props.serializedScene])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || runtime || initializationStarted.current) {
      return
    }

    initializationStarted.current = true
    let isActive = true

    void initializeWebGpuCanvas(canvas).then((result) => {
      if (!isActive) {
        return
      }

      if (!result.ok) {
        setRuntimeState("unsupported")
        setStatusMessage(result.reason)
        return
      }

      setRuntime(result.runtime)
      setRuntimeState("ready")
      setStatusMessage(`WebGPU runtime ready with ${result.runtime.format}.`)
    })

    return () => {
      isActive = false
    }
  }, [runtime])

  useEffect(() => {
    if (!runtime) {
      return
    }

    return () => {
      releaseWebGpuComputeRippleResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuComputeRippleScene(canvas, runtime, scene)
    setStatusMessage(`Rendered ${computeRippleStageLabel(scene)} into ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: computeRippleClearColor(scene) },
    { label: "Accent color", value: computeRippleAccentColor(scene) },
    { label: "Pipeline stages", value: computeRippleStageLabel(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(buildWorkbenchShareUrl(ROUTE_PATH, scene))
        setStatusMessage(
          wasCopied
            ? "Share link copied to the clipboard."
            : "Clipboard copy is unavailable in this environment.",
        )
        break
      }
      case "export-png": {
        const didDownload = canvasRef.current
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-compute-ripple.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)
        setStatusMessage("Compute-ripple scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const key = event.key.toLowerCase()

    switch (key) {
      case "r":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          red: stepNumericValue(current.red, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "g":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          green: stepNumericValue(current.green, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "b":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blue: stepNumericValue(current.blue, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "a":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          alpha: stepNumericValue(current.alpha, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "m":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          amplitude: stepNumericValue(
            current.amplitude,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "f":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          frequency: stepNumericValue(
            current.frequency,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          drift: stepNumericValue(current.drift, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Compute Ripple"
      description="A Next.js WebGPU route for dispatching a compute pass that writes a shared storage-plus-vertex buffer before rendering it."
      highlights={[
        "Thirteenth Next.js Phase 5 route introducing a compute pass ahead of rendering",
        "The compute pipeline writes positions and colors into a storage-plus-vertex buffer consumed by the render pipeline",
        "Same guarded WebGPU bootstrap, runtime-scoped resource cache, export flow, and explicit teardown pattern",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Ripple controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuComputeRippleScene]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]: clampChannel(nextValue),
                    }))
                  }
                />
              )
            })}
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
            ariaLabel="WebGPU compute-ripple viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the compute-ripple route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU compute-ripple scene"
              />
            )}
          </WorkbenchViewportSurface>
          <WorkbenchMetricGrid metrics={metrics} />
        </>
      }
      notes={
        <>
          <h2>Route notes</h2>
          <p className="vm-copy">
            {webGpuComputeRippleSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route closes Phase 5 parity by adding compute-driven geometry generation while
            keeping the same shared runtime, browser guards, and workbench contract.
          </p>
        </>
      }
    />
  )
}

function runtimeStatusLabel(state: RuntimeState): string {
  switch (state) {
    case "ready":
      return "Ready"
    case "unsupported":
      return "Unsupported"
    default:
      return "Checking"
  }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}
