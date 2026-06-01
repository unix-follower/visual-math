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
  DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
  isWebGpuUniformTransformScene,
  type WebGpuUniformTransformScene,
  uniformTransformArea,
  uniformTransformClearColor,
  uniformTransformPeakColor,
  webGpuUniformTransformSummary,
} from "./webgpu-uniform-transform.model"
import {
  releaseWebGpuUniformTransformResources,
  renderWebGpuUniformTransformScene,
} from "./webgpu-uniform-transform.renderer"

const WEBGPU_UNIFORM_TRANSFORM_ROUTE_PATH = "/phase-5/webgpu-uniform-transform"
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
    id: "scale",
    label: "Scale",
    min: 0.35,
    max: 1.1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "rotation",
    label: "Rotation",
    min: -180,
    max: 180,
    step: 1,
  },
  {
    kind: "range",
    id: "offsetX",
    label: "Offset X",
    min: -0.45,
    max: 0.45,
    step: 0.01,
  },
  {
    kind: "range",
    id: "offsetY",
    label: "Offset Y",
    min: -0.45,
    max: 0.45,
    step: 0.01,
  },
  {
    kind: "range",
    id: "accent",
    label: "Accent mix",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuUniformTransformScene>[] = [
  {
    label: "Card tilt",
    description: "Balanced transform showing rotation, slight offset, and a warm accent mix.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.2,
      alpha: 1,
      scale: 0.78,
      rotation: 18,
      offsetX: 0.08,
      offsetY: -0.04,
      accent: 0.72,
    },
  },
  {
    label: "Aligned",
    description: "Centered mesh with a cooler clear color and lighter accent blending.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      scale: 0.9,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      accent: 0.42,
    },
  },
  {
    label: "Orbit corner",
    description: "Stronger translation and rotation to emphasize GPU-side transform control.",
    state: {
      red: 0.1,
      green: 0.14,
      blue: 0.12,
      alpha: 1,
      scale: 0.62,
      rotation: -34,
      offsetX: -0.18,
      offsetY: 0.16,
      accent: 0.82,
    },
  },
  {
    label: "Glass frame",
    description: "Softer alpha and more restrained accent blending with a mild clockwise turn.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.68,
      scale: 0.72,
      rotation: 12,
      offsetX: 0.12,
      offsetY: 0.08,
      accent: 0.28,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized uniform-transform WebGPU scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current uniform-transform viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default uniform-transform scene.",
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
  { keys: "S / Shift+S", description: "Increase or decrease the scale." },
  { keys: "T / Shift+T", description: "Increase or decrease the rotation." },
  {
    keys: "X / Shift+X",
    description: "Increase or decrease the horizontal offset.",
  },
  {
    keys: "Y / Shift+Y",
    description: "Increase or decrease the vertical offset.",
  },
  { keys: "N / Shift+N", description: "Increase or decrease the accent mix." },
  {
    keys: "Escape",
    description: "Reset to the default uniform-transform scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuUniformTransformPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuUniformTransformScene>(
    DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the uniform-transform route checks browser support and prepares GPU-side parameter updates.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuUniformTransformScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        scale: clampScale(initialScene.scale),
        rotation: clampRotation(initialScene.rotation),
        offsetX: clampOffset(initialScene.offsetX),
        offsetY: clampOffset(initialScene.offsetY),
        accent: clampChannel(initialScene.accent),
      })
      setStatusMessage("Loaded the uniform-transform scene from the shared URL.")
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
      releaseWebGpuUniformTransformResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuUniformTransformScene(canvas, runtime, scene)
    setStatusMessage(`Submitted a uniform-buffer WebGPU draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: uniformTransformClearColor(scene) },
    { label: "Peak color", value: uniformTransformPeakColor(scene) },
    { label: "Transform area", value: uniformTransformArea(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_UNIFORM_TRANSFORM_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-uniform-transform.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)
        setStatusMessage("Uniform-transform scene reset to the default preset.")
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
        setStatusMessage("Updated the red channel.")
        break
      case "g":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          green: stepNumericValue(current.green, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the green channel.")
        break
      case "b":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blue: stepNumericValue(current.blue, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the blue channel.")
        break
      case "a":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          alpha: stepNumericValue(current.alpha, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the alpha channel.")
        break
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          scale: stepNumericValue(current.scale, event.shiftKey ? -0.05 : 0.05, clampScale),
        }))
        setStatusMessage("Updated the transform scale.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotation: stepNumericValue(current.rotation, event.shiftKey ? -6 : 6, clampRotation),
        }))
        setStatusMessage("Updated the transform rotation.")
        break
      case "x":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          offsetX: stepNumericValue(current.offsetX, event.shiftKey ? -0.04 : 0.04, clampOffset),
        }))
        setStatusMessage("Updated the horizontal offset.")
        break
      case "y":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          offsetY: stepNumericValue(current.offsetY, event.shiftKey ? -0.04 : 0.04, clampOffset),
        }))
        setStatusMessage("Updated the vertical offset.")
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          accent: stepNumericValue(current.accent, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the accent mix.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)
        setStatusMessage("Uniform-transform scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Uniform Transform"
      description="A Next.js WebGPU route for introducing uniform-buffer driven scale, rotation, translation, and accent mixing on top of the shared Phase 5 runtime."
      highlights={[
        "Fourth Next.js Phase 5 route introducing a true uniform buffer instead of CPU-side geometry rewrites",
        "Static vertex mesh transformed in the shader with scale, rotation, translation, and accent controls",
        "Same shared WebGPU runtime helpers, resource caching, export flow, and route-local teardown pattern",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Transform controls">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    WebGpuUniformTransformScene,
                    | "red"
                    | "green"
                    | "blue"
                    | "alpha"
                    | "scale"
                    | "rotation"
                    | "offsetX"
                    | "offsetY"
                    | "accent"
                  >
                ]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "rotation" ? `${Math.round(value)}deg` : value.toFixed(2)
                  }
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]:
                        control.id === "scale"
                          ? clampScale(nextValue)
                          : control.id === "rotation"
                            ? clampRotation(nextValue)
                            : control.id === "offsetX" || control.id === "offsetY"
                              ? clampOffset(nextValue)
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
            ariaLabel="WebGPU uniform transform viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the uniform-transform route is showing
                a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU uniform-transform scene"
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
            {webGpuUniformTransformSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.format,
            )}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from indexed draws to shader-driven uniform updates while
            keeping the same browser guards, shared WebGPU bootstrap, and route-local workbench
            contract.
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
  return Number(Math.max(0.35, Math.min(1.1, value)).toFixed(2))
}

function clampRotation(value: number): number {
  return Math.max(-180, Math.min(180, Math.round(value)))
}

function clampOffset(value: number): number {
  return Number(Math.max(-0.45, Math.min(0.45, value)).toFixed(2))
}
