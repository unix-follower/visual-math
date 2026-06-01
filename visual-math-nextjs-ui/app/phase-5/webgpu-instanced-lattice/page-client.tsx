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
  DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
  instancedLatticeAccentColor,
  instancedLatticeClearColor,
  instancedLatticeStageLabel,
  isWebGpuInstancedLatticeScene,
  type WebGpuInstancedLatticeScene,
  webGpuInstancedLatticeSummary,
} from "./webgpu-instanced-lattice.model"
import {
  releaseWebGpuInstancedLatticeResources,
  renderWebGpuInstancedLatticeScene,
} from "./webgpu-instanced-lattice.renderer"

const WEBGPU_INSTANCED_LATTICE_ROUTE_PATH = "/phase-5/webgpu-instanced-lattice"
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
    id: "spacing",
    label: "Instance spacing",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "scale",
    label: "Mesh scale",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "tilt",
    label: "Vertical tilt",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuInstancedLatticeScene>[] = [
  {
    label: "Balanced grid",
    description: "Default instanced lattice with moderate spacing and scale.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      spacing: 0.48,
      scale: 0.56,
      tilt: 0.34,
    },
  },
  {
    label: "Tight band",
    description: "Closer instance placement with taller, denser triangles.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.2,
      alpha: 1,
      spacing: 0.22,
      scale: 0.78,
      tilt: 0.18,
    },
  },
  {
    label: "Wide relay",
    description: "Broader spacing and flatter instance geometry.",
    state: {
      red: 0.08,
      green: 0.12,
      blue: 0.16,
      alpha: 1,
      spacing: 0.84,
      scale: 0.3,
      tilt: 0.62,
    },
  },
  {
    label: "Glass rake",
    description: "Lower alpha and a stronger alternating vertical offset.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.22,
      alpha: 0.74,
      spacing: 0.54,
      scale: 0.42,
      tilt: 0.82,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized instanced-lattice scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current instanced-lattice viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default instanced-lattice scene.",
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
    description: "Increase or decrease the instance spacing.",
  },
  { keys: "M / Shift+M", description: "Increase or decrease the mesh scale." },
  {
    keys: "T / Shift+T",
    description: "Increase or decrease the vertical tilt.",
  },
  {
    keys: "Escape",
    description: "Reset to the default instanced-lattice scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuInstancedLatticePageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuInstancedLatticeScene>(
    DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the instanced-lattice route checks browser support and prepares mesh plus instance buffers.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuInstancedLatticeScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        spacing: clampChannel(initialScene.spacing),
        scale: clampChannel(initialScene.scale),
        tilt: clampChannel(initialScene.tilt),
      })
      setStatusMessage("Loaded the instanced-lattice scene from the shared URL.")
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
      releaseWebGpuInstancedLatticeResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuInstancedLatticeScene(canvas, runtime, scene)
    setStatusMessage(`Submitted an instanced WebGPU draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: instancedLatticeClearColor(scene) },
    { label: "Accent color", value: instancedLatticeAccentColor(scene) },
    { label: "Draw mode", value: instancedLatticeStageLabel() },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_INSTANCED_LATTICE_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-instanced-lattice.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)
        setStatusMessage("Instanced-lattice scene reset to the default preset.")
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
          spacing: stepNumericValue(current.spacing, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the instance spacing.")
        break
      case "m":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          scale: stepNumericValue(current.scale, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the mesh scale.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          tilt: stepNumericValue(current.tilt, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the vertical tilt.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)
        setStatusMessage("Instanced-lattice scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Instanced Lattice"
      description="A Next.js WebGPU route for introducing instanced rendering from one shared triangle mesh across multiple instance records."
      highlights={[
        "Sixth Next.js Phase 5 route introducing true instanced rendering from one shared mesh",
        "A single triangle mesh is reused across five per-instance records with unique offsets, scales, and colors",
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
          <WorkbenchControlSection heading="Instance controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuInstancedLatticeScene]

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
            ariaLabel="WebGPU instanced lattice viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the instanced-lattice route is showing
                a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU instanced-lattice scene"
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
            {webGpuInstancedLatticeSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.format,
            )}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from uniform-buffer updates to true instancing while keeping
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
