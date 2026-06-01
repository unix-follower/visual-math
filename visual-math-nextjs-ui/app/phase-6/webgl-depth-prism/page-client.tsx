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
  DEFAULT_WEBGL_DEPTH_PRISM_SCENE,
  isWebGlDepthPrismScene,
  type WebGlDepthPrismScene,
  webGlDepthPrismAccentColor,
  webGlDepthPrismCameraLabel,
  webGlDepthPrismClearColor,
  webGlDepthPrismOcclusionLabel,
  webGlDepthPrismSummary,
} from "./webgl-depth-prism.model"
import {
  releaseWebGlDepthPrismResources,
  renderWebGlDepthPrismScene,
} from "./webgl-depth-prism.renderer"

const ROUTE_PATH = "/phase-6/webgl-depth-prism"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "yaw", label: "Yaw", min: -80, max: 80, step: 1 },
  { kind: "range", id: "pitch", label: "Pitch", min: -50, max: 50, step: 1 },
  { kind: "range", id: "distance", label: "Distance", min: 2.2, max: 6.8, step: 0.1 },
  { kind: "range", id: "prismLift", label: "Prism lift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "prismSpread", label: "Prism spread", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "accent", label: "Accent mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlDepthPrismScene>[] = [
  {
    label: "Studio prism",
    description: "Balanced camera and lift values that keep all six faces readable.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      yaw: 24,
      pitch: 18,
      distance: 4.4,
      prismLift: 0.46,
      prismSpread: 0.58,
      accent: 0.42,
    },
  },
  {
    label: "Tall orbit",
    description: "Higher camera pitch and lift to emphasize top-face visibility and occlusion.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.08,
      alpha: 1,
      yaw: 34,
      pitch: 28,
      distance: 4.9,
      prismLift: 0.78,
      prismSpread: 0.46,
      accent: 0.58,
    },
  },
  {
    label: "Wide base",
    description: "Lower lift and broader spread for a flatter but wider depth-tested silhouette.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.14,
      alpha: 1,
      yaw: 12,
      pitch: 10,
      distance: 3.8,
      prismLift: 0.24,
      prismSpread: 0.84,
      accent: 0.32,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL depth-prism scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL depth-prism viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL depth-prism scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "Y / Shift+Y", description: "Increase or decrease the camera yaw." },
  { keys: "P / Shift+P", description: "Increase or decrease the camera pitch." },
  { keys: "D / Shift+D", description: "Increase or decrease the camera distance." },
  { keys: "L / Shift+L", description: "Increase or decrease the prism lift." },
  { keys: "S / Shift+S", description: "Increase or decrease the prism spread." },
  { keys: "N / Shift+N", description: "Increase or decrease the accent mix." },
  { keys: "Escape", description: "Reset to the default depth-prism scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlDepthPrismPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlDepthPrismScene>(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the depth-prism route checks browser support and prepares a depth-tested solid draw.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGlDepthPrismScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        yaw: clampYaw(initialScene.yaw),
        pitch: clampPitch(initialScene.pitch),
        distance: clampDistance(initialScene.distance),
        prismLift: clampChannel(initialScene.prismLift),
        prismSpread: clampChannel(initialScene.prismSpread),
        accent: clampChannel(initialScene.accent),
      })
      setStatusMessage("Loaded the depth-prism scene from the shared URL.")
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
      releaseWebGlDepthPrismResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlDepthPrismScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a depth-tested WebGL prism using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlDepthPrismClearColor(scene) },
    { label: "Accent color", value: webGlDepthPrismAccentColor(scene) },
    { label: "Camera", value: webGlDepthPrismCameraLabel(scene) },
    { label: "Occlusion", value: webGlDepthPrismOcclusionLabel(scene) },
    { label: "Support detected", value: hasWebGlSupport() ? "Yes" : "No" },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-depth-prism.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)
        setStatusMessage("Depth-prism scene reset to the default preset.")
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
      case "y":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          yaw: stepNumericValue(current.yaw, event.shiftKey ? -4 : 4, clampYaw),
        }))
        break
      case "p":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          pitch: stepNumericValue(current.pitch, event.shiftKey ? -4 : 4, clampPitch),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          distance: stepNumericValue(current.distance, event.shiftKey ? -0.2 : 0.2, clampDistance),
        }))
        break
      case "l":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          prismLift: stepNumericValue(
            current.prismLift,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          prismSpread: stepNumericValue(
            current.prismSpread,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          accent: stepNumericValue(current.accent, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_DEPTH_PRISM_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Depth Prism"
      description="A Next.js WebGL2 route that draws a shaded prism with depth testing enabled so camera motion changes which faces and edges remain visible."
      highlights={[
        "First Next.js Phase 6 route to enable depth testing for solid 3D face occlusion",
        "Extends the projected-camera baseline with normals, face shading, and prism-specific lift and spread controls while keeping geometry static on the GPU",
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
          <WorkbenchControlSection heading="Depth controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlDepthPrismScene
              const value = scene[sceneKey]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(control.step >= 1 ? 0 : 2)}
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
            ariaLabel="WebGL depth prism viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the depth prism route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL depth prism scene"
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
            {webGlDepthPrismSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route adds real face occlusion and simple directional shading so later Phase 6
            material routes can build on a tested depth-enabled solid rendering baseline.
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

function clampSceneValue(key: keyof WebGlDepthPrismScene, value: number): number {
  switch (key) {
    case "yaw":
      return clampYaw(value)
    case "pitch":
      return clampPitch(value)
    case "distance":
      return clampDistance(value)
    default:
      return clampChannel(value)
  }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function clampYaw(value: number): number {
  return Math.max(-80, Math.min(80, Math.round(value)))
}

function clampPitch(value: number): number {
  return Math.max(-50, Math.min(50, Math.round(value)))
}

function clampDistance(value: number): number {
  return Number(Math.max(2.2, Math.min(6.8, value)).toFixed(1))
}
