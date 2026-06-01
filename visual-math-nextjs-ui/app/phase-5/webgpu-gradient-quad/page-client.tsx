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
  DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE,
  gradientQuadArea,
  gradientQuadClearColor,
  gradientQuadPeakColor,
  isWebGpuGradientQuadScene,
  type WebGpuGradientQuadScene,
  webGpuGradientQuadSummary,
} from "./webgpu-gradient-quad.model"
import {
  releaseWebGpuGradientQuadResources,
  renderWebGpuGradientQuadScene,
} from "./webgpu-gradient-quad.renderer"

const WEBGPU_GRADIENT_QUAD_ROUTE_PATH = "/phase-5/webgpu-gradient-quad"
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
    id: "inset",
    label: "Quad inset",
    min: 0.08,
    max: 0.42,
    step: 0.01,
  },
  {
    kind: "range",
    id: "tilt",
    label: "Quad tilt",
    min: -0.35,
    max: 0.35,
    step: 0.01,
  },
  {
    kind: "range",
    id: "intensity",
    label: "Gradient intensity",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuGradientQuadScene>[] = [
  {
    label: "Aurora",
    description: "Balanced gradient quad with a gentle diagonal tilt.",
    state: {
      red: 0.08,
      green: 0.14,
      blue: 0.22,
      alpha: 1,
      inset: 0.22,
      tilt: 0.12,
      intensity: 0.78,
    },
  },
  {
    label: "Blueprint",
    description: "Cool background with a tighter surface and higher intensity.",
    state: {
      red: 0.05,
      green: 0.1,
      blue: 0.24,
      alpha: 1,
      inset: 0.16,
      tilt: -0.08,
      intensity: 0.92,
    },
  },
  {
    label: "Sun panel",
    description: "Warmer clear color and stronger skew for contrast.",
    state: {
      red: 0.24,
      green: 0.16,
      blue: 0.12,
      alpha: 1,
      inset: 0.24,
      tilt: 0.22,
      intensity: 0.7,
    },
  },
  {
    label: "Glass tile",
    description: "Transparent backdrop with a quieter gradient surface.",
    state: {
      red: 0.14,
      green: 0.2,
      blue: 0.26,
      alpha: 0.62,
      inset: 0.28,
      tilt: -0.18,
      intensity: 0.48,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGPU gradient quad scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGPU gradient quad viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGPU gradient quad scene.",
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
  { keys: "I / Shift+I", description: "Increase or decrease the quad inset." },
  { keys: "T / Shift+T", description: "Increase or decrease the quad tilt." },
  {
    keys: "N / Shift+N",
    description: "Increase or decrease the gradient intensity.",
  },
  {
    keys: "Escape",
    description: "Reset to the default WebGPU gradient quad scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuGradientQuadPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuGradientQuadScene>(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGPU viewport checks browser support and prepares a second reusable scene pattern.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGpuGradientQuadScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        inset: clampInset(initialScene.inset),
        tilt: clampTilt(initialScene.tilt),
        intensity: clampChannel(initialScene.intensity),
      })
      setStatusMessage("Loaded the WebGPU gradient quad scene from the shared URL.")
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
      releaseWebGpuGradientQuadResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuGradientQuadScene(canvas, runtime, scene)
    setStatusMessage(`Submitted a WebGPU gradient quad draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: gradientQuadClearColor(scene) },
    { label: "Peak color", value: gradientQuadPeakColor(scene) },
    { label: "Quad area", value: gradientQuadArea(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_GRADIENT_QUAD_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-gradient-quad.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)
        setStatusMessage("WebGPU gradient quad scene reset to the default preset.")
        break
    }
  }

  function handleViewportKeydown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const delta = event.shiftKey ? -0.05 : 0.05
    const key = event.key.toLowerCase()

    switch (key) {
      case "r":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          red: stepNumericValue(current.red, delta, clampChannel),
        }))
        setStatusMessage("Updated the red channel.")
        break
      case "g":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          green: stepNumericValue(current.green, delta, clampChannel),
        }))
        setStatusMessage("Updated the green channel.")
        break
      case "b":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blue: stepNumericValue(current.blue, delta, clampChannel),
        }))
        setStatusMessage("Updated the blue channel.")
        break
      case "a":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          alpha: stepNumericValue(current.alpha, delta, clampChannel),
        }))
        setStatusMessage("Updated the alpha channel.")
        break
      case "i":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          inset: stepNumericValue(current.inset, delta, clampInset),
        }))
        setStatusMessage("Updated the quad inset.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          tilt: stepNumericValue(current.tilt, delta, clampTilt),
        }))
        setStatusMessage("Updated the quad tilt.")
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          intensity: stepNumericValue(current.intensity, delta, clampChannel),
        }))
        setStatusMessage("Updated the gradient intensity.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)
        setStatusMessage("WebGPU gradient quad scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Gradient Quad"
      description="A Next.js WebGPU route for validating a six-vertex quad draw, color interpolation, and a second reusable scene pattern on top of the shared Phase 5 runtime."
      highlights={[
        "Second Next.js Phase 5 route exercising the shared WebGPU renderer helpers",
        "Six-vertex quad draw with gradient color interpolation",
        "Route-local teardown and shared runtime-scoped resource caching",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Gradient controls">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    WebGpuGradientQuadScene,
                    "red" | "green" | "blue" | "alpha" | "inset" | "tilt" | "intensity"
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
                      [control.id]:
                        control.id === "inset"
                          ? clampInset(nextValue)
                          : control.id === "tilt"
                            ? clampTilt(nextValue)
                            : clampChannel(nextValue),
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
            ariaLabel="WebGPU gradient quad viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the gradient quad route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU gradient quad scene"
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
            {webGpuGradientQuadSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 past the first triangle by proving the same shared runtime
            can drive a larger vertex buffer, interpolated colors, and a richer reusable surface
            without changing the workbench contract.
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

function clampInset(value: number): number {
  return Number(Math.max(0.08, Math.min(0.42, value)).toFixed(2))
}

function clampTilt(value: number): number {
  return Number(Math.max(-0.35, Math.min(0.35, value)).toFixed(2))
}
