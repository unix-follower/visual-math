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
  DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
  indirectIndexedPolygonArea,
  indirectIndexedPolygonClearColor,
  indirectIndexedPolygonEncodedIndexCount,
  indirectIndexedPolygonIndexCount,
  indirectIndexedPolygonPeakColor,
  indirectIndexedPolygonStageLabel,
  indirectIndexedPolygonVertexCount,
  isWebGpuIndirectIndexedPolygonScene,
  type WebGpuIndirectIndexedPolygonScene,
  webGpuIndirectIndexedPolygonSummary,
} from "./webgpu-indirect-indexed-polygon.model"
import {
  releaseWebGpuIndirectIndexedPolygonResources,
  renderWebGpuIndirectIndexedPolygonScene,
} from "./webgpu-indirect-indexed-polygon.renderer"

const WEBGPU_INDIRECT_INDEXED_POLYGON_ROUTE_PATH = "/phase-5/webgpu-indirect-indexed-polygon"
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
  {
    kind: "range",
    id: "coverage",
    label: "Encoded index coverage",
    min: 0.34,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuIndirectIndexedPolygonScene>[] = [
  {
    label: "Balanced coverage",
    description:
      "A heptagon where the indirect buffer submits most, but not all, indexed triangles.",
    state: {
      red: 0.05,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      sides: 7,
      radius: 0.66,
      rotation: 10,
      intensity: 0.76,
      coverage: 0.78,
    },
  },
  {
    label: "Full octagon",
    description: "Eight sides and full encoded coverage for the complete indexed fan.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.2,
      alpha: 1,
      sides: 8,
      radius: 0.58,
      rotation: -18,
      intensity: 0.82,
      coverage: 1,
    },
  },
  {
    label: "Sparse triad",
    description: "Minimal indexed geometry that makes the encoded draw payload obvious.",
    state: {
      red: 0.12,
      green: 0.14,
      blue: 0.12,
      alpha: 1,
      sides: 3,
      radius: 0.76,
      rotation: 20,
      intensity: 0.62,
      coverage: 0.34,
    },
  },
  {
    label: "Glass heptagon",
    description: "Lower alpha and partial coverage for a softer clipped indexed fan.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.74,
      sides: 7,
      radius: 0.5,
      rotation: -26,
      intensity: 0.48,
      coverage: 0.58,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized indirect indexed polygon scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current indirect indexed polygon viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default indirect indexed polygon scene.",
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
    keys: "C / Shift+C",
    description: "Increase or decrease the encoded index coverage.",
  },
  {
    keys: "Escape",
    description: "Reset to the default indirect indexed polygon scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuIndirectIndexedPolygonPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuIndirectIndexedPolygonScene>(
    DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the indirect indexed polygon route checks browser support and prepares indexed draw arguments inside a GPU indirect buffer.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuIndirectIndexedPolygonScene,
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
        coverage: clampCoverage(initialScene.coverage),
      })
      setStatusMessage("Loaded the indirect indexed polygon scene from the shared URL.")
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
      releaseWebGpuIndirectIndexedPolygonResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuIndirectIndexedPolygonScene(canvas, runtime, scene)
    setStatusMessage(`Submitted an indirect indexed WebGPU draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: indirectIndexedPolygonClearColor(scene) },
    { label: "Peak color", value: indirectIndexedPolygonPeakColor(scene) },
    { label: "Vertices", value: `${indirectIndexedPolygonVertexCount(scene)}` },
    {
      label: "Full indices",
      value: `${indirectIndexedPolygonIndexCount(scene)}`,
    },
    {
      label: "Encoded indices",
      value: `${indirectIndexedPolygonEncodedIndexCount(scene)}`,
    },
    { label: "Area", value: indirectIndexedPolygonArea(scene) },
    { label: "Draw path", value: indirectIndexedPolygonStageLabel(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_INDIRECT_INDEXED_POLYGON_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-indirect-indexed-polygon.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)
        setStatusMessage("Indirect indexed polygon scene reset to the default preset.")
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
        setStatusMessage("Updated the radius.")
        break
      case "o":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotation: stepNumericValue(current.rotation, event.shiftKey ? -6 : 6, clampRotation),
        }))
        setStatusMessage("Updated the rotation.")
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
      case "c":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          coverage: stepNumericValue(
            current.coverage,
            event.shiftKey ? -0.05 : 0.05,
            clampCoverage,
          ),
        }))
        setStatusMessage("Updated the encoded index coverage.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE)
        setStatusMessage("Indirect indexed polygon scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Indirect Indexed Polygon"
      description="A Next.js WebGPU route for combining indexed geometry with a drawIndexedIndirect argument buffer on top of the shared Phase 5 runtime."
      highlights={[
        "Ninth Next.js Phase 5 route combining index buffers with drawIndexedIndirect submission",
        "The render pass binds a uint16 index buffer but pulls indexCount from a GPU indirect argument buffer",
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
          <WorkbenchControlSection heading="Polygon controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuIndirectIndexedPolygonScene]
              const displayValue =
                control.id === "sides"
                  ? `${Math.round(value)}`
                  : control.id === "rotation"
                    ? `${Math.round(value)}deg`
                    : value.toFixed(2)

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={displayValue}
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
                              : control.id === "coverage"
                                ? clampCoverage(nextValue)
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
            ariaLabel="WebGPU indirect indexed polygon viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the indirect indexed polygon route is
                showing a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU indirect indexed polygon scene"
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
            {webGpuIndirectIndexedPolygonSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.format,
            )}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from indirect non-indexed draws to indexed indirect
            submission while keeping the same shared runtime, browser guards, and workbench
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

function clampSides(value: number): number {
  return Math.max(3, Math.min(8, Math.round(value)))
}

function clampRadius(value: number): number {
  return Number(Math.max(0.32, Math.min(0.84, value)).toFixed(2))
}

function clampRotation(value: number): number {
  return Math.max(-180, Math.min(180, Math.round(value)))
}

function clampCoverage(value: number): number {
  return Number(Math.max(0.34, Math.min(1, value)).toFixed(2))
}
