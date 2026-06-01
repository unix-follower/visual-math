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
  DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
  indexedPolygonArea,
  indexedPolygonClearColor,
  indexedPolygonIndexCount,
  indexedPolygonPeakColor,
  indexedPolygonVertexCount,
  isWebGpuIndexedPolygonScene,
  type WebGpuIndexedPolygonScene,
  webGpuIndexedPolygonSummary,
} from "./webgpu-indexed-polygon.model"
import {
  releaseWebGpuIndexedPolygonResources,
  renderWebGpuIndexedPolygonScene,
} from "./webgpu-indexed-polygon.renderer"

const WEBGPU_INDEXED_POLYGON_ROUTE_PATH = "/phase-5/webgpu-indexed-polygon"
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
    id: "sides",
    label: "Polygon sides",
    min: 3,
    max: 8,
    step: 1,
  },
  {
    kind: "range",
    id: "radius",
    label: "Polygon radius",
    min: 0.32,
    max: 0.84,
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
    id: "intensity",
    label: "Color intensity",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuIndexedPolygonScene>[] = [
  {
    label: "Hex bloom",
    description: "Balanced six-sided indexed draw with a broad radius and warm center glow.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      sides: 6,
      radius: 0.68,
      rotation: 14,
      intensity: 0.74,
    },
  },
  {
    label: "Octagon",
    description: "Dense indexed fan showing higher topology and a cooler backdrop.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.2,
      alpha: 1,
      sides: 8,
      radius: 0.58,
      rotation: -12,
      intensity: 0.82,
    },
  },
  {
    label: "Triad",
    description: "Minimal indexed geometry with stronger rotation and tighter coverage.",
    state: {
      red: 0.12,
      green: 0.14,
      blue: 0.1,
      alpha: 1,
      sides: 3,
      radius: 0.74,
      rotation: 30,
      intensity: 0.62,
    },
  },
  {
    label: "Glass heptagon",
    description: "Seven-sided polygon with softer alpha and lower intensity.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.72,
      sides: 7,
      radius: 0.5,
      rotation: -26,
      intensity: 0.46,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized indexed WebGPU polygon scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current indexed polygon viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default indexed polygon scene.",
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
    description: "Increase or decrease the polygon side count.",
  },
  { keys: "D / Shift+D", description: "Increase or decrease the radius." },
  { keys: "O / Shift+O", description: "Increase or decrease the rotation." },
  {
    keys: "N / Shift+N",
    description: "Increase or decrease the color intensity.",
  },
  {
    keys: "Escape",
    description: "Reset to the default indexed polygon scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuIndexedPolygonPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuIndexedPolygonScene>(
    DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the indexed polygon route checks browser support and prepares indexed WebGPU geometry.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuIndexedPolygonScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        sides: clampSides(initialScene.sides),
        radius: clampRadius(initialScene.radius),
        rotation: clampRotation(initialScene.rotation),
        intensity: clampChannel(initialScene.intensity),
      })
      setStatusMessage("Loaded the indexed polygon scene from the shared URL.")
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
      releaseWebGpuIndexedPolygonResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuIndexedPolygonScene(canvas, runtime, scene)
    setStatusMessage(`Submitted an indexed WebGPU polygon draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: indexedPolygonClearColor(scene) },
    { label: "Peak color", value: indexedPolygonPeakColor(scene) },
    { label: "Vertices", value: `${indexedPolygonVertexCount(scene)}` },
    { label: "Indices", value: `${indexedPolygonIndexCount(scene)}` },
    { label: "Area", value: indexedPolygonArea(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_INDEXED_POLYGON_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-indexed-polygon.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
        setStatusMessage("Indexed polygon scene reset to the default preset.")
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
          sides: stepNumericValue(current.sides, event.shiftKey ? -1 : 1, clampSides),
        }))
        setStatusMessage("Updated the polygon side count.")
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          radius: stepNumericValue(current.radius, event.shiftKey ? -0.05 : 0.05, clampRadius),
        }))
        setStatusMessage("Updated the polygon radius.")
        break
      case "o":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotation: stepNumericValue(current.rotation, event.shiftKey ? -6 : 6, clampRotation),
        }))
        setStatusMessage("Updated the polygon rotation.")
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          intensity: stepNumericValue(
            current.intensity,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        setStatusMessage("Updated the color intensity.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
        setStatusMessage("Indexed polygon scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Indexed Polygon"
      description="A Next.js WebGPU route for extending the shared Phase 5 runtime to indexed geometry, triangle-fan polygon assembly, and drawIndexed rendering."
      highlights={[
        "Third Next.js Phase 5 route introducing indexed geometry instead of pure sequential vertices",
        "Triangle-fan style polygon built from shared vertices plus a uint16 index buffer",
        "Same shared WebGPU runtime helpers, caching, export, and route-local teardown pattern",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Polygon controls">
            {RANGE_CONTROLS.map((control) => {
              const value =
                scene[
                  control.id as keyof Pick<
                    WebGpuIndexedPolygonScene,
                    | "red"
                    | "green"
                    | "blue"
                    | "alpha"
                    | "sides"
                    | "radius"
                    | "rotation"
                    | "intensity"
                  >
                ]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "sides"
                      ? `${Math.round(value)}`
                      : control.id === "rotation"
                        ? `${Math.round(value)}deg`
                        : value.toFixed(2)
                  }
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]:
                        control.id === "sides"
                          ? clampSides(nextValue)
                          : control.id === "radius"
                            ? clampRadius(nextValue)
                            : control.id === "rotation"
                              ? clampRotation(nextValue)
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
            ariaLabel="WebGPU indexed polygon viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the indexed polygon route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU indexed polygon scene"
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
            {webGpuIndexedPolygonSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from sequential vertices to indexed geometry while keeping
            the same browser guards, shared WebGPU bootstrap, and route-local workbench contract.
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

function clampSides(value: number): number {
  return Math.max(3, Math.min(8, Math.round(value)))
}

function clampRadius(value: number): number {
  return Number(Math.max(0.32, Math.min(0.84, value)).toFixed(2))
}

function clampRotation(value: number): number {
  return Math.max(-180, Math.min(180, Math.round(value)))
}
