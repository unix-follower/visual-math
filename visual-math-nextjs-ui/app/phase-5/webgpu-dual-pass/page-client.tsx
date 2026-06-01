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
  DEFAULT_WEBGPU_DUAL_PASS_SCENE,
  dualPassAccentColor,
  dualPassClearColor,
  dualPassStageLabel,
  isWebGpuDualPassScene,
  type WebGpuDualPassScene,
  webGpuDualPassSummary,
} from "./webgpu-dual-pass.model"
import {
  releaseWebGpuDualPassResources,
  renderWebGpuDualPassScene,
} from "./webgpu-dual-pass.renderer"

const ROUTE_PATH = "/phase-5/webgpu-dual-pass"
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
  { kind: "range", id: "glow", label: "Glow", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "skew", label: "Skew", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGpuDualPassScene>[] = [
  {
    label: "Balanced composite",
    description: "Default offscreen render followed by a moderate second-pass composite.",
    state: {
      red: 0.06,
      green: 0.1,
      blue: 0.2,
      alpha: 1,
      glow: 0.68,
      skew: 0.42,
      mix: 0.58,
    },
  },
  {
    label: "Wide bloom",
    description: "Stronger glow and skew with a brighter composite target.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.18,
      alpha: 1,
      glow: 0.9,
      skew: 0.74,
      mix: 0.66,
    },
  },
  {
    label: "Tight weave",
    description: "Lower glow with less skew and a restrained blend between both passes.",
    state: {
      red: 0.1,
      green: 0.12,
      blue: 0.24,
      alpha: 0.84,
      glow: 0.34,
      skew: 0.16,
      mix: 0.32,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized dual-pass scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current dual-pass viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default dual-pass scene.",
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
  { keys: "W / Shift+W", description: "Increase or decrease the glow." },
  { keys: "S / Shift+S", description: "Increase or decrease the skew." },
  { keys: "M / Shift+M", description: "Increase or decrease the pass mix." },
  { keys: "Escape", description: "Reset to the default dual-pass scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGpuDualPassPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGpuDualPassScene>(DEFAULT_WEBGPU_DUAL_PASS_SCENE)
  const [runtime, setRuntime] = useState<WebGpuCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the dual-pass route checks browser support and prepares offscreen plus onscreen render passes.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGpuDualPassScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        glow: clampChannel(initialScene.glow),
        skew: clampChannel(initialScene.skew),
        mix: clampChannel(initialScene.mix),
      })
      setStatusMessage("Loaded the dual-pass scene from the shared URL.")
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
      releaseWebGpuDualPassResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGpuDualPassScene(canvas, runtime, scene)
    setStatusMessage(`Rendered ${dualPassStageLabel(scene)} into ${runtime.format}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Canvas format", value: runtime?.format ?? "Unavailable" },
    { label: "Clear color", value: dualPassClearColor(scene) },
    { label: "Accent color", value: dualPassAccentColor(scene) },
    { label: "Pipeline stages", value: dualPassStageLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgpu-dual-pass.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGPU_DUAL_PASS_SCENE)
        setStatusMessage("Dual-pass scene reset to the default preset.")
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
      case "w":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          glow: stepNumericValue(current.glow, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          skew: stepNumericValue(current.skew, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "m":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          mix: stepNumericValue(current.mix, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGPU_DUAL_PASS_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 5"
      title="WebGPU Dual Pass"
      description="A Next.js WebGPU route for rendering into an offscreen texture first and compositing it in a second pass."
      highlights={[
        "Twelfth Next.js Phase 5 route introducing an explicit offscreen render target plus second-pass composite",
        "The first pass writes colored geometry into an intermediate texture and the second pass samples it with textureLoad",
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
          <WorkbenchControlSection heading="Composite controls">
            {RANGE_CONTROLS.map((control) => {
              const value = scene[control.id as keyof WebGpuDualPassScene]

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
            ariaLabel="WebGPU dual-pass viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGPU is unavailable in this environment, so the dual-pass route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGPU dual-pass scene"
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
            {webGpuDualPassSummary(scene, runtimeStatusLabel(runtimeState), runtime?.format)}
          </p>
          <p className="vm-copy">
            This route extends Phase 5 from single-pass texture work into explicit multi-pass
            composition while keeping the same shared runtime, browser guards, and workbench
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
