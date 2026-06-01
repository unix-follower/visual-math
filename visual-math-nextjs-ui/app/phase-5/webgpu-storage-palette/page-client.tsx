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
  DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
  isWebGpuStoragePaletteScene,
  storagePaletteClearColor,
  storagePalettePeakColor,
  storagePaletteSpread,
  type WebGpuStoragePaletteScene,
  webGpuStoragePaletteSummary,
} from "./webgpu-storage-palette.model"
import {
  releaseWebGpuStoragePaletteResources,
  renderWebGpuStoragePaletteScene,
} from "./webgpu-storage-palette.renderer"

const WEBGPU_STORAGE_PALETTE_ROUTE_PATH = "/phase-5/webgpu-storage-palette"
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
    id: "warmth",
    label: "Palette warmth",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "contrast",
    label: "Palette contrast",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "balance",
    label: "Palette balance",
    min: -1,
    max: 1,
    step: 0.01,
  },
  { kind: "range", id: "glow", label: "Glow lift", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuStoragePaletteScene>[] = [
  {
    label: "Lantern",
    description: "Warm palette with balanced contrast and a mild positive color shift.",
    state: {
      red: 0.05,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      warmth: 0.62,
      contrast: 0.74,
      balance: 0.12,
      glow: 0.68,
    },
  },
  {
    label: "Cool glass",
    description: "Lower warmth and higher blue emphasis for a colder storage-driven palette.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      warmth: 0.24,
      contrast: 0.52,
      balance: -0.22,
      glow: 0.38,
    },
  },
  {
    label: "Signal burst",
    description: "Higher contrast and glow for stronger vertex-color separation.",
    state: {
      red: 0.12,
      green: 0.1,
      blue: 0.12,
      alpha: 1,
      warmth: 0.78,
      contrast: 0.94,
      balance: 0.28,
      glow: 0.86,
    },
  },
  {
    label: "Muted panel",
    description: "Softer alpha and restrained palette spread with a cooler balance.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.68,
      warmth: 0.34,
      contrast: 0.28,
      balance: -0.14,
      glow: 0.24,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized storage-palette WebGPU scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current storage-palette viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default storage-palette scene.",
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
    keys: "W / Shift+W",
    description: "Increase or decrease the palette warmth.",
  },
  {
    keys: "C / Shift+C",
    description: "Increase or decrease the palette contrast.",
  },
  {
    keys: "L / Shift+L",
    description: "Increase or decrease the palette balance.",
  },
  { keys: "N / Shift+N", description: "Increase or decrease the glow lift." },
  {
    keys: "Escape",
    description: "Reset to the default storage-palette scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuStoragePalettePageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuStoragePaletteScene>(
    DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the storage-palette route checks browser support and prepares shader-readable storage data.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuStoragePaletteScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        warmth: clampChannel(initialScene.warmth),
        contrast: clampChannel(initialScene.contrast),
        balance: clampBalance(initialScene.balance),
        glow: clampChannel(initialScene.glow),
      })
      setStatusMessage("Loaded the storage-palette scene from the shared URL.")
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
      releaseWebGpuStoragePaletteResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuStoragePaletteScene(canvas, runtime, scene)
    setStatusMessage(`Submitted a storage-buffer WebGPU draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: storagePaletteClearColor(scene) },
    { label: "Peak color", value: storagePalettePeakColor(scene) },
    { label: "Palette spread", value: storagePaletteSpread(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_STORAGE_PALETTE_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-storage-palette.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)
        setStatusMessage("Storage-palette scene reset to the default preset.")
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
      case "w":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          warmth: stepNumericValue(current.warmth, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the palette warmth.")
        break
      case "c":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          contrast: stepNumericValue(current.contrast, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the palette contrast.")
        break
      case "l":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          balance: stepNumericValue(current.balance, event.shiftKey ? -0.08 : 0.08, clampBalance),
        }))
        setStatusMessage("Updated the palette balance.")
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          glow: stepNumericValue(current.glow, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the glow lift.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)
        setStatusMessage("Storage-palette scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Storage Palette"
      description="A Next.js WebGPU route for introducing shader-readable storage-buffer palette data on top of a static vertex mesh."
      highlights={[
        "Seventh Next.js Phase 5 route introducing a real storage buffer for shader-read palette data",
        "Static vertex mesh colored from a six-entry GPU storage palette instead of per-vertex color attributes",
        "Same shared WebGPU runtime helpers, bind-group caching, export actions, and route-local teardown pattern",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Palette controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuStoragePaletteScene]

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
                        control.id === "balance"
                          ? clampBalance(nextValue)
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
            ariaLabel="WebGPU storage palette viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the storage-palette route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU storage-palette scene"
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
            {webGpuStoragePaletteSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from instancing to shader-readable storage data while keeping
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

function clampBalance(value: number): number {
  return Number(Math.max(-1, Math.min(1, value)).toFixed(2))
}
