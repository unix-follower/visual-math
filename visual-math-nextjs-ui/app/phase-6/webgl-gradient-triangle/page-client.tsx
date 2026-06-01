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
  DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
  isWebGlGradientTriangleScene,
  type WebGlGradientTriangleScene,
  webGlGradientTriangleArea,
  webGlGradientTriangleClearColor,
  webGlGradientTrianglePeakColor,
  webGlGradientTriangleRotationLabel,
  webGlGradientTriangleSummary,
} from "./webgl-gradient-triangle.model"
import {
  releaseWebGlGradientTriangleResources,
  renderWebGlGradientTriangleScene,
} from "./webgl-gradient-triangle.renderer"

const WEBGL_GRADIENT_TRIANGLE_ROUTE_PATH = "/phase-6/webgl-gradient-triangle"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "scale", label: "Triangle scale", min: 0.4, max: 1.2, step: 0.01 },
  { kind: "range", id: "rotation", label: "Rotation", min: -180, max: 180, step: 1 },
  { kind: "range", id: "accent", label: "Accent strength", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlGradientTriangleScene>[] = [
  {
    label: "Default prism",
    description: "Balanced clear color with the baseline triangle scale and accent.",
    state: { red: 0.08, green: 0.12, blue: 0.18, alpha: 1, scale: 0.86, rotation: 0, accent: 0.78 },
  },
  {
    label: "Blueprint",
    description: "Cooler background with a tighter triangle and stronger accent lift.",
    state: { red: 0.05, green: 0.1, blue: 0.22, alpha: 1, scale: 0.72, rotation: -12, accent: 0.9 },
  },
  {
    label: "Signal flare",
    description: "Warmer base color with a larger rotated triangle for contrast.",
    state: { red: 0.2, green: 0.14, blue: 0.1, alpha: 1, scale: 1.02, rotation: 18, accent: 0.62 },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL gradient triangle scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL gradient triangle viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL gradient triangle scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "S / Shift+S", description: "Increase or decrease triangle scale." },
  { keys: "T / Shift+T", description: "Increase or decrease rotation." },
  { keys: "C / Shift+C", description: "Increase or decrease accent strength." },
  { keys: "Escape", description: "Reset to the default WebGL gradient triangle scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlGradientTrianglePageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlGradientTriangleScene>(
    DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGL viewport checks browser support and prepares the first shader-backed triangle render.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlGradientTriangleScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        scale: clampScale(initialScene.scale),
        rotation: clampRotation(initialScene.rotation),
        accent: clampChannel(initialScene.accent),
      })
      setStatusMessage("Loaded the WebGL gradient triangle scene from the shared URL.")
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
      releaseWebGlGradientTriangleResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlGradientTriangleScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a WebGL gradient triangle using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlGradientTriangleClearColor(scene) },
    { label: "Peak color", value: webGlGradientTrianglePeakColor(scene) },
    { label: "Triangle area", value: webGlGradientTriangleArea(scene) },
    { label: "Rotation", value: webGlGradientTriangleRotationLabel(scene) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGL_GRADIENT_TRIANGLE_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-gradient-triangle.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)
        setStatusMessage("WebGL gradient triangle scene reset to the default preset.")
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
          scale: stepNumericValue(current.scale, event.shiftKey ? -0.04 : 0.04, clampScale),
        }))
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rotation: stepNumericValue(current.rotation, event.shiftKey ? -6 : 6, clampRotation),
        }))
        break
      case "c":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          accent: stepNumericValue(current.accent, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_GRADIENT_TRIANGLE_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Gradient Triangle"
      description="A Next.js WebGL2 route that compiles shaders, uploads interleaved vertex data, and draws the first gradient geometry in Phase 6."
      highlights={[
        "First Next.js Phase 6 route to compile shaders and link a WebGL2 program",
        "Uses interleaved position and color attributes so later geometry routes can reuse the same binding pattern",
        "Keeps the same serialized scene, unsupported fallback, export flow, and teardown contract as the completed Canvas and WebGPU surfaces",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Triangle controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlGradientTriangleScene
              const value = scene[sceneKey]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={control.id === "rotation" ? value.toFixed(0) : value.toFixed(2)}
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
            ariaLabel="WebGL gradient triangle viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the gradient triangle route is showing
                a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL gradient triangle scene"
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
            {webGlGradientTriangleSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route extends the foundation clear-pass baseline with shader compilation, program
            linking, buffer upload, and attribute binding so the next Phase 6 geometry routes can
            build on tested WebGL2 draw-path behavior.
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

function clampSceneValue(key: keyof WebGlGradientTriangleScene, value: number): number {
  switch (key) {
    case "scale":
      return clampScale(value)
    case "rotation":
      return clampRotation(value)
    default:
      return clampChannel(value)
  }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function clampScale(value: number): number {
  return Number(Math.max(0.4, Math.min(1.2, value)).toFixed(2))
}

function clampRotation(value: number): number {
  return Number(Math.max(-180, Math.min(180, value)).toFixed(0))
}
