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
  DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
  isWebGlPerspectiveCameraScene,
  type WebGlPerspectiveCameraScene,
  webGlPerspectiveCameraAccentColor,
  webGlPerspectiveCameraAngles,
  webGlPerspectiveCameraClearColor,
  webGlPerspectiveCameraDepthLabel,
  webGlPerspectiveCameraLens,
  webGlPerspectiveCameraSummary,
} from "./webgl-perspective-camera.model"
import {
  releaseWebGlPerspectiveCameraResources,
  renderWebGlPerspectiveCameraScene,
} from "./webgl-perspective-camera.renderer"

const ROUTE_PATH = "/phase-6/webgl-perspective-camera"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "yaw", label: "Yaw", min: -75, max: 75, step: 1 },
  { kind: "range", id: "pitch", label: "Pitch", min: -75, max: 75, step: 1 },
  { kind: "range", id: "distance", label: "Distance", min: 2, max: 7, step: 0.1 },
  { kind: "range", id: "fov", label: "Field of view", min: 30, max: 90, step: 1 },
  { kind: "range", id: "depth", label: "Depth span", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "accent", label: "Accent mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlPerspectiveCameraScene>[] = [
  {
    label: "Gallery wall",
    description: "Balanced camera angle with moderate depth separation and warm foreground lift.",
    state: {
      red: 0.04,
      green: 0.07,
      blue: 0.12,
      alpha: 1,
      yaw: 22,
      pitch: 14,
      distance: 3.8,
      fov: 58,
      depth: 0.56,
      accent: 0.62,
    },
  },
  {
    label: "Flat study",
    description: "Shorter depth span and centered lens for a calmer layered composition.",
    state: {
      red: 0.06,
      green: 0.09,
      blue: 0.16,
      alpha: 1,
      yaw: 0,
      pitch: 6,
      distance: 3.2,
      fov: 46,
      depth: 0.22,
      accent: 0.38,
    },
  },
  {
    label: "Stage sweep",
    description: "Wider lens and stronger yaw to exaggerate the layered z-range.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.1,
      alpha: 1,
      yaw: 38,
      pitch: 24,
      distance: 4.6,
      fov: 72,
      depth: 0.84,
      accent: 0.76,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL perspective-camera scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL perspective-camera viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL perspective-camera scene.",
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
  { keys: "F / Shift+F", description: "Increase or decrease the field of view." },
  { keys: "Z / Shift+Z", description: "Increase or decrease the depth span." },
  { keys: "N / Shift+N", description: "Increase or decrease the accent mix." },
  { keys: "Escape", description: "Reset to the default perspective-camera scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlPerspectiveCameraPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlPerspectiveCameraScene>(
    DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the perspective-camera route checks browser support and prepares the first projected WebGL draw.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlPerspectiveCameraScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        yaw: clampAngle(initialScene.yaw),
        pitch: clampAngle(initialScene.pitch),
        distance: clampDistance(initialScene.distance),
        fov: clampFov(initialScene.fov),
        depth: clampChannel(initialScene.depth),
        accent: clampChannel(initialScene.accent),
      })
      setStatusMessage("Loaded the perspective-camera scene from the shared URL.")
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
      releaseWebGlPerspectiveCameraResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlPerspectiveCameraScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a projected WebGL scene using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlPerspectiveCameraClearColor(scene) },
    { label: "Accent color", value: webGlPerspectiveCameraAccentColor(scene) },
    { label: "Camera angles", value: webGlPerspectiveCameraAngles(scene) },
    { label: "Lens", value: webGlPerspectiveCameraLens(scene) },
    { label: "Depth span", value: webGlPerspectiveCameraDepthLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-perspective-camera.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)
        setStatusMessage("Perspective-camera scene reset to the default preset.")
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
          yaw: stepNumericValue(current.yaw, event.shiftKey ? -4 : 4, clampAngle),
        }))
        break
      case "p":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          pitch: stepNumericValue(current.pitch, event.shiftKey ? -4 : 4, clampAngle),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          distance: stepNumericValue(current.distance, event.shiftKey ? -0.2 : 0.2, clampDistance),
        }))
        break
      case "f":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          fov: stepNumericValue(current.fov, event.shiftKey ? -4 : 4, clampFov),
        }))
        break
      case "z":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          depth: stepNumericValue(current.depth, event.shiftKey ? -0.05 : 0.05, clampChannel),
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
        setScene(DEFAULT_WEBGL_PERSPECTIVE_CAMERA_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Perspective Camera"
      description="A Next.js WebGL2 route that keeps layered geometry static in model space and moves the viewpoint with a perspective camera for the first projected Phase 6 scene."
      highlights={[
        "First Next.js Phase 6 route to move from flat clip-space composition into a perspective view-projection matrix",
        "Extends the existing shared WebGL shader and buffer helpers with route-local camera math while keeping the geometry resident on the GPU",
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
          <WorkbenchControlSection heading="Camera controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlPerspectiveCameraScene
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
            ariaLabel="WebGL perspective camera viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the perspective camera route is
                showing a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL perspective camera scene"
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
            {webGlPerspectiveCameraSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route turns the earlier flat WebGL slices into a camera-driven composition so the
            next Phase 6 steps can build on tested view-projection math before depth-tested solids
            and lit materials arrive.
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

function clampSceneValue(key: keyof WebGlPerspectiveCameraScene, value: number): number {
  switch (key) {
    case "yaw":
    case "pitch":
      return clampAngle(value)
    case "distance":
      return clampDistance(value)
    case "fov":
      return clampFov(value)
    default:
      return clampChannel(value)
  }
}

function clampChannel(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2))
}

function clampAngle(value: number): number {
  return Math.max(-75, Math.min(75, Math.round(value)))
}

function clampDistance(value: number): number {
  return Number(Math.max(2, Math.min(7, value)).toFixed(1))
}

function clampFov(value: number): number {
  return Math.max(30, Math.min(90, Math.round(value)))
}
