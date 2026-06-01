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
  DEFAULT_WEBGPU_TEXTURE_GRID_SCENE,
  isWebGpuTextureGridScene,
  textureGridAccentColor,
  textureGridClearColor,
  textureGridDensity,
  type WebGpuTextureGridScene,
  webGpuTextureGridSummary,
} from "./webgpu-texture-grid.model"
import {
  releaseWebGpuTextureGridResources,
  renderWebGpuTextureGridScene,
} from "./webgpu-texture-grid.renderer"

const ROUTE_PATH = "/phase-5/webgpu-texture-grid"
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
    id: "frequency",
    label: "Frequency",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "contrast",
    label: "Contrast",
    min: 0,
    max: 1,
    step: 0.01,
  },
  { kind: "range", id: "blend", label: "Blend", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuTextureGridScene>[] = [
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
    description: "Copy a URL with the current serialized texture-grid scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current texture-grid viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default texture-grid scene.",
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
    keys: "F / Shift+F",
    description: "Increase or decrease the texture frequency.",
  },
  {
    keys: "C / Shift+C",
    description: "Increase or decrease the texture contrast.",
  },
  {
    keys: "L / Shift+L",
    description: "Increase or decrease the texture blend.",
  },
  { keys: "Escape", description: "Reset to the default texture-grid scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuTextureGridPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuTextureGridScene>(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the texture-grid route checks browser support and prepares a small uploaded texture before the first draw.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGpuTextureGridScene)

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
      releaseWebGpuTextureGridResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuTextureGridScene(canvas, runtime, scene)
    setStatusMessage(`Uploaded a texture and submitted a WebGPU draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: textureGridClearColor(scene) },
    { label: "Accent color", value: textureGridAccentColor(scene) },
    { label: "Texture density", value: textureGridDensity(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-texture-grid.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)
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
        setStatusMessage("Updated the texture frequency.")
        break
      case "c":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          contrast: stepNumericValue(current.contrast, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the texture contrast.")
        break
      case "l":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          blend: stepNumericValue(current.blend, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the texture blend.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)
        setStatusMessage("Texture-grid scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Texture Grid"
      description="A Next.js WebGPU route for uploading a small texture each frame and reading it in the fragment shader with textureLoad."
      highlights={[
        "Tenth Next.js Phase 5 route introducing explicit GPU texture uploads through writeTexture",
        "The fragment shader reads a rewritten 4x4 texture instead of a storage or uniform buffer",
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
          <WorkbenchControlSection heading="Texture controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuTextureGridScene]

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={value.toFixed(2)}
                  onChange={(nextValue) =>
                    setScene((current) => ({
                      ...current,
                      [control.id]: clampChannel(nextValue),
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
            ariaLabel="WebGPU texture grid viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the texture-grid route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU texture-grid scene"
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
            {webGpuTextureGridSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from indirect submission into texture-backed fragment
            sampling while keeping the same shared runtime, browser guards, and workbench contract.
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
