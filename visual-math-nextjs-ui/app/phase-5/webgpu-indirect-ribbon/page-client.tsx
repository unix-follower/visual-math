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
  DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
  indirectRibbonAccentColor,
  indirectRibbonClearColor,
  indirectRibbonStageLabel,
  isWebGpuIndirectRibbonScene,
  type WebGpuIndirectRibbonScene,
  webGpuIndirectRibbonSummary,
} from "./webgpu-indirect-ribbon.model"
import {
  releaseWebGpuIndirectRibbonResources,
  renderWebGpuIndirectRibbonScene,
} from "./webgpu-indirect-ribbon.renderer"

const WEBGPU_INDIRECT_RIBBON_ROUTE_PATH = "/phase-5/webgpu-indirect-ribbon"
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
    id: "span",
    label: "Ribbon span",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "taper",
    label: "Ribbon taper",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    kind: "range",
    id: "echo",
    label: "Echo count bias",
    min: 0,
    max: 1,
    step: 0.01,
  },
]
const PRESETS: readonly WorkbenchPreset<WebGpuIndirectRibbonScene>[] = [
  {
    label: "Balanced ribbon",
    description: "Default indirect draw with a broad span and moderate taper.",
    state: {
      red: 0.05,
      green: 0.1,
      blue: 0.18,
      alpha: 1,
      span: 0.56,
      taper: 0.42,
      echo: 0.34,
    },
  },
  {
    label: "Wide echo",
    description: "Broader ribbon and more indirect instances from the draw buffer.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.2,
      alpha: 1,
      span: 0.84,
      taper: 0.24,
      echo: 0.88,
    },
  },
  {
    label: "Needle trace",
    description: "Narrower ribbon with sharper taper and quieter indirect repeats.",
    state: {
      red: 0.08,
      green: 0.1,
      blue: 0.16,
      alpha: 1,
      span: 0.26,
      taper: 0.82,
      echo: 0.14,
    },
  },
  {
    label: "Glass wake",
    description: "Lower alpha and a softer indirect ribbon profile.",
    state: {
      red: 0.1,
      green: 0.16,
      blue: 0.24,
      alpha: 0.74,
      span: 0.42,
      taper: 0.34,
      echo: 0.62,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized indirect-ribbon scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current indirect-ribbon viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default indirect-ribbon scene.",
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
  { keys: "S / Shift+S", description: "Increase or decrease the ribbon span." },
  {
    keys: "T / Shift+T",
    description: "Increase or decrease the ribbon taper.",
  },
  {
    keys: "E / Shift+E",
    description: "Increase or decrease the indirect echo count.",
  },
  {
    keys: "Escape",
    description: "Reset to the default indirect-ribbon scene.",
  },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuIndirectRibbonPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuIndirectRibbonScene>(
    DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the indirect-ribbon route checks browser support and prepares a draw buffer for indirect submission.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGpuIndirectRibbonScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        span: clampChannel(initialScene.span),
        taper: clampChannel(initialScene.taper),
        echo: clampChannel(initialScene.echo),
      })
      setStatusMessage("Loaded the indirect-ribbon scene from the shared URL.")
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
      releaseWebGpuIndirectRibbonResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuIndirectRibbonScene(canvas, runtime, scene)
    setStatusMessage(`Submitted an indirect WebGPU draw using ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: indirectRibbonClearColor(scene) },
    { label: "Accent color", value: indirectRibbonAccentColor(scene) },
    { label: "Draw path", value: indirectRibbonStageLabel(scene) },
    { label: "Support detected", value: hasWebGpuSupport() ? "Yes" : "No" },
  ] as const

  async function handleAction(actionId: string): Promise<void> {
    switch (actionId) {
      case "copy-share-link": {
        const wasCopied = await copyWorkbenchText(
          buildWorkbenchShareUrl(WEBGPU_INDIRECT_RIBBON_ROUTE_PATH, scene),
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-indirect-ribbon.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
        setStatusMessage("Indirect-ribbon scene reset to the default preset.")
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
          span: stepNumericValue(current.span, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the ribbon span.")
        break
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          taper: stepNumericValue(current.taper, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the ribbon taper.")
        break
      case "e":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          echo: stepNumericValue(current.echo, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        setStatusMessage("Updated the indirect echo count.")
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
        setStatusMessage("Indirect-ribbon scene reset to the default preset.")
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Indirect Ribbon"
      description="A Next.js WebGPU route for introducing draw parameters encoded inside an indirect GPU buffer before the render pass executes."
      highlights={[
        "Eighth Next.js Phase 5 route introducing an indirect draw buffer instead of direct draw arguments",
        "The render pass pulls vertexCount and instanceCount from GPU buffer data through drawIndirect",
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
          <WorkbenchControlSection heading="Ribbon controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuIndirectRibbonScene]

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
            ariaLabel="WebGPU indirect ribbon viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the indirect-ribbon route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU indirect-ribbon scene"
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
            {webGpuIndirectRibbonSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from storage data to indirect draw submission while keeping
            the same shared runtime, browser guards, and workbench contract.
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
