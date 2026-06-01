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
  hasWebGlSupport,
  initializeWebGlCanvas,
  type WebGlCanvasRuntime,
} from "@/app/shared/webgl/webgl-bootstrap"

import {
  DEFAULT_WEBGL_INDEXED_POLYGON_SCENE,
  isWebGlIndexedPolygonScene,
  type WebGlIndexedPolygonScene,
  webGlIndexedPolygonArea,
  webGlIndexedPolygonClearColor,
  webGlIndexedPolygonIndexCount,
  webGlIndexedPolygonPeakColor,
  webGlIndexedPolygonSummary,
  webGlIndexedPolygonVertexCount,
} from "./webgl-indexed-polygon.model"
import {
  releaseWebGlIndexedPolygonResources,
  renderWebGlIndexedPolygonScene,
} from "./webgl-indexed-polygon.renderer"

const WEBGL_INDEXED_POLYGON_ROUTE_PATH = "/phase-6/webgl-indexed-polygon"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "sides", label: "Polygon sides", min: 3, max: 8, step: 1 },
  { kind: "range", id: "radius", label: "Polygon radius", min: 0.32, max: 0.84, step: 0.01 },
  { kind: "range", id: "rotation", label: "Rotation", min: -180, max: 180, step: 1 },
  { kind: "range", id: "intensity", label: "Color intensity", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlIndexedPolygonScene>[] = [
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
      intensity: 0.72,
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
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL indexed polygon scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL indexed polygon viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL indexed polygon scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease the polygon side count." },
  { keys: "D / Shift+D", description: "Increase or decrease the radius." },
  { keys: "O / Shift+O", description: "Increase or decrease the rotation." },
  { keys: "N / Shift+N", description: "Increase or decrease the color intensity." },
  { keys: "Escape", description: "Reset to the default indexed polygon scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlIndexedPolygonPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlIndexedPolygonScene>(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the indexed polygon route checks browser support and prepares indexed WebGL geometry.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlIndexedPolygonScene,
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
    const result = initializeWebGlCanvas(canvas)

    if (!result.ok) {
      setRuntimeState("unsupported")
      setStatusMessage(result.reason)
      return
    }

    setRuntime(result.runtime)
    setRuntimeState("ready")
    setStatusMessage(`WebGL runtime ready with ${result.runtime.version}.`)
  }, [runtime])

  useEffect(() => {
    if (!runtime) {
      return
    }

    return () => {
      releaseWebGlIndexedPolygonResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlIndexedPolygonScene(canvas, runtime, scene)
    setStatusMessage(`Rendered an indexed WebGL polygon using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlIndexedPolygonClearColor(scene) },
    { label: "Peak color", value: webGlIndexedPolygonPeakColor(scene) },
    { label: "Vertices", value: `${webGlIndexedPolygonVertexCount(scene)}` },
    { label: "Indices", value: `${webGlIndexedPolygonIndexCount(scene)}` },
    { label: "Surface area", value: webGlIndexedPolygonArea(scene) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGL_INDEXED_POLYGON_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-indexed-polygon.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)
        setStatusMessage("WebGL indexed polygon scene reset to the default preset.")
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
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          sides: stepIntegerValue(current.sides, event.shiftKey ? -1 : 1, clampSides),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          radius: stepNumericValue(current.radius, event.shiftKey ? -0.04 : 0.04, clampRadius),
        }))
        break
      case "o":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotation: stepNumericValue(current.rotation, event.shiftKey ? -6 : 6, clampRotation),
        }))
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
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_INDEXED_POLYGON_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Indexed Polygon"
      description="A Next.js WebGL2 route that uploads shared vertices plus uint16 indices and uses drawElements for the first indexed Phase 6 geometry path."
      highlights={[
        "First Next.js Phase 6 route to introduce index-buffer drawing on the WebGL path",
        "Reuses the shared shader, buffer, and attribute helpers while avoiding duplicated perimeter vertices",
        "Preserves the same serialized scene, unsupported fallback, export flow, and explicit teardown contract used by the completed Canvas and WebGPU surfaces",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Indexed geometry controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlIndexedPolygonScene
              const value = scene[sceneKey]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={
                    control.id === "sides" || control.id === "rotation"
                      ? value.toFixed(0)
                      : value.toFixed(2)
                  }
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [sceneKey]: clampSceneValue(sceneKey, nextValue),
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
            ariaLabel="WebGL indexed polygon viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the indexed polygon route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL indexed polygon scene"
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
            {webGlIndexedPolygonSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route extends the uniform-transform baseline with shared vertex reuse and
            drawElements so the next WebGL slices can move into indexed 3D and texture-backed
            geometry without duplicating every perimeter position in the vertex buffer.
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

function clampSceneValue(key: keyof WebGlIndexedPolygonScene, value: number): number {
  switch (key) {
    case "sides":
      return clampSides(value)
    case "radius":
      return clampRadius(value)
    case "rotation":
      return clampRotation(value)
    default:
      return clampChannel(value)
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
  return Number(Math.max(-180, Math.min(180, value)).toFixed(0))
}

function stepIntegerValue(value: number, delta: number, clamp: (value: number) => number): number {
  return clamp(value + delta)
}
