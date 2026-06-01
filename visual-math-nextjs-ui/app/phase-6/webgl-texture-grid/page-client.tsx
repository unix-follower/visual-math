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
  DEFAULT_WEBGL_TEXTURE_GRID_SCENE,
  isWebGlTextureGridScene,
  type WebGlTextureGridScene,
  webGlTextureGridAccentColor,
  webGlTextureGridClearColor,
  webGlTextureGridDensity,
  webGlTextureGridSummary,
} from "./webgl-texture-grid.model"
import {
  releaseWebGlTextureGridResources,
  renderWebGlTextureGridScene,
} from "./webgl-texture-grid.renderer"

const ROUTE_PATH = "/phase-6/webgl-texture-grid"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "frequency", label: "Frequency", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "contrast", label: "Contrast", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blend", label: "Blend", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlTextureGridScene>[] = [
  {
    label: "Balanced grid",
    description: "Default 4x4 texture rewrite with a moderate checker contrast.",
    state: {
      red: 0.08,
      green: 0.1,
      blue: 0.22,
      alpha: 1,
      frequency: 0.5,
      contrast: 0.7,
      blend: 0.6,
    },
  },
  {
    label: "Bold lattice",
    description: "Higher contrast and stronger blend across the uploaded texture.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.2,
      alpha: 1,
      frequency: 0.82,
      contrast: 0.92,
      blend: 0.78,
    },
  },
  {
    label: "Soft glass",
    description: "Lower alpha and gentler contrast for a muted sampled grid.",
    state: {
      red: 0.12,
      green: 0.16,
      blue: 0.26,
      alpha: 0.72,
      frequency: 0.34,
      contrast: 0.42,
      blend: 0.38,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL texture-grid scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL texture-grid viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL texture-grid scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "F / Shift+F", description: "Increase or decrease the texture frequency." },
  { keys: "C / Shift+C", description: "Increase or decrease the texture contrast." },
  { keys: "L / Shift+L", description: "Increase or decrease the texture blend." },
  { keys: "Escape", description: "Reset to the default texture-grid scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlTextureGridPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlTextureGridScene>(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the texture-grid route checks browser support and prepares a small uploaded texture before the first draw.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGlTextureGridScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        frequency: clampChannel(initialScene.frequency),
        contrast: clampChannel(initialScene.contrast),
        blend: clampChannel(initialScene.blend),
      })
      setStatusMessage("Loaded the texture-grid scene from the shared URL.")
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
      releaseWebGlTextureGridResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlTextureGridScene(canvas, runtime, scene)
    setStatusMessage(`Uploaded a texture and rendered a WebGL draw using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlTextureGridClearColor(scene) },
    { label: "Accent color", value: webGlTextureGridAccentColor(scene) },
    { label: "Texture density", value: webGlTextureGridDensity(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-texture-grid.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)
        setStatusMessage("Texture-grid scene reset to the default preset.")
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
      case "c":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          contrast: stepNumericValue(current.contrast, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "l":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blend: stepNumericValue(current.blend, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_TEXTURE_GRID_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Texture Grid"
      description="A Next.js WebGL2 route that uploads a small procedural RGBA texture and samples it on a fullscreen quad for the first texture-backed Phase 6 draw path."
      highlights={[
        "First Next.js Phase 6 route to upload texture data and sample it from a fragment shader",
        "Reuses the shared WebGL texture helpers with a resident quad so later material routes can build on a tested texture path",
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
          <WorkbenchControlSection heading="Texture controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlTextureGridScene
              const value = scene[sceneKey]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [sceneKey]: clampChannel(nextValue),
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
            ariaLabel="WebGL texture grid viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the texture grid route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL texture grid scene"
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
            {webGlTextureGridSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route extends the indexed-geometry baseline with texture upload and fragment
            sampling so later WebGL routes can move into textured materials and multi-pass effects
            on a tested texture-backed draw path.
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
