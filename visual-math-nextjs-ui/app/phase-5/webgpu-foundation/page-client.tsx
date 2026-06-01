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
  DEFAULT_WEBGPU_FOUNDATION_SCENE,
  formatClearColor,
  isWebGpuFoundationScene,
  triangleAreaEstimate,
  triangleColorLabel,
  type WebGpuFoundationScene,
  webGpuFoundationSummary,
} from "./webgpu-foundation.model"
import {
  releaseWebGpuFoundationResources,
  renderWebGpuFoundationScene,
} from "./webgpu-foundation.renderer"

const WEBGPU_FOUNDATION_ROUTE_PATH = "/phase-5/webgpu-foundation"
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
    id: "triangleScale",
    label: "Triangle scale",
    min: 0.25,
    max: 0.95,
    step: 0.01,
  },
  {
    kind: "range",
    id: "accent",
    label: "Triangle accent",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuFoundationScene>[] = [
  {
    label: "Slate default",
    description: "A restrained engineering palette with a balanced triangle overlay.",
    state: {
      red: 0.14,
      green: 0.23,
      blue: 0.39,
      alpha: 1,
      triangleScale: 0.62,
      accent: 0.78,
    },
  },
  {
    label: "Ocean",
    description: "Cool tones with a slightly larger primitive to emphasize the first draw call.",
    state: {
      red: 0.07,
      green: 0.36,
      blue: 0.56,
      alpha: 1,
      triangleScale: 0.74,
      accent: 0.58,
    },
  },
  {
    label: "Sunrise",
    description: "Warm tones with a bright triangle accent for stronger fragment output.",
    state: {
      red: 0.83,
      green: 0.42,
      blue: 0.22,
      alpha: 1,
      triangleScale: 0.56,
      accent: 0.92,
    },
  },
  {
    label: "Glass",
    description: "Lower alpha with a smaller primitive to show layered composition clearly.",
    state: {
      red: 0.42,
      green: 0.72,
      blue: 0.78,
      alpha: 0.55,
      triangleScale: 0.44,
      accent: 0.66,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGPU foundation scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGPU foundation viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGPU foundation scene.",
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
    keys: "S / Shift+S",
    description: "Increase or decrease the triangle scale.",
  },
  {
    keys: "T / Shift+T",
    description: "Increase or decrease the triangle accent.",
  },
  {
    keys: "Escape",
    description: "Reset to the default WebGPU foundation scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuFoundationPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuFoundationScene>(DEFAULT_WEBGPU_FOUNDATION_SCENE)
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGPU viewport checks browser support and prepares the first pipeline-backed draw.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGpuFoundationScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        triangleScale: clampScale(initialScene.triangleScale),
        accent: clampChannel(initialScene.accent),
      })
      setStatusMessage("Loaded the WebGPU foundation scene from the shared URL.")
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
      releaseWebGpuFoundationResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuFoundationScene(canvas, runtime, scene)
    setStatusMessage(`Submitted a WebGPU pipeline draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: formatClearColor(scene) },
    { label: "Triangle color", value: triangleColorLabel(scene) },
    { label: "Triangle area", value: triangleAreaEstimate(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_FOUNDATION_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-foundation.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_FOUNDATION_SCENE)
        setStatusMessage("WebGPU foundation scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          triangleScale: stepNumericValue(current.triangleScale, delta, clampScale),
        }))
        setStatusMessage("Updated the triangle scale.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          accent: stepNumericValue(current.accent, delta, clampChannel),
        }))
        setStatusMessage("Updated the triangle accent.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_FOUNDATION_SCENE)
        setStatusMessage("WebGPU foundation scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Foundation"
      description="A Next.js WebGPU route for establishing adapter detection, canvas configuration, shader-backed pipeline setup, and the first GPU triangle draw inside the shared workbench shell."
      highlights={[
        "First Next.js Phase 5 route inside the existing workbench shell",
        "Local WebGPU bootstrap with browser and adapter guards",
        "GPU triangle draw backed by shaders, a render pipeline, and a vertex buffer",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Foundation controls">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    WebGpuFoundationScene,
                    "red" | "green" | "blue" | "alpha" | "triangleScale" | "accent"
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
                        control.id === "triangleScale"
                          ? clampScale(nextValue)
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
            ariaLabel="WebGPU foundation viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the foundation route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU foundation scene"
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
            {webGpuFoundationSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route starts Phase 5 by proving the Next.js app can keep the existing workbench
            contract while adding browser-guarded WebGPU initialization, shader modules, vertex
            buffers, and a single render-pass draw.
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

function clampScale(value: number): number {
  return Number(Math.max(0.25, Math.min(0.95, value)).toFixed(2))
}
