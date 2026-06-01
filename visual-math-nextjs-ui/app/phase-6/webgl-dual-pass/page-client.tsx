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
  DEFAULT_WEBGL_DUAL_PASS_SCENE,
  isWebGlDualPassScene,
  type WebGlDualPassScene,
  webGlDualPassAccentColor,
  webGlDualPassClearColor,
  webGlDualPassStageLabel,
  webGlDualPassSummary,
} from "./webgl-dual-pass.model"
import { releaseWebGlDualPassResources, renderWebGlDualPassScene } from "./webgl-dual-pass.renderer"

const ROUTE_PATH = "/phase-6/webgl-dual-pass"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "glow", label: "Glow", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "skew", label: "Skew", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlDualPassScene>[] = [
  {
    label: "Balanced glow",
    description: "Moderate skew and composite mix for a readable two-pass baseline.",
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
    label: "Hot prism",
    description: "Higher glow and stronger composite mix for a brighter offscreen lift.",
    state: {
      red: 0.04,
      green: 0.08,
      blue: 0.18,
      alpha: 1,
      glow: 0.88,
      skew: 0.66,
      mix: 0.82,
    },
  },
  {
    label: "Soft echo",
    description: "Lower glow and gentler mix for a subtler composite return pass.",
    state: {
      red: 0.08,
      green: 0.12,
      blue: 0.22,
      alpha: 1,
      glow: 0.34,
      skew: 0.28,
      mix: 0.24,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL dual-pass scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL dual-pass viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL dual-pass scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "H / Shift+H", description: "Increase or decrease glow." },
  { keys: "K / Shift+K", description: "Increase or decrease skew." },
  { keys: "M / Shift+M", description: "Increase or decrease composite mix." },
  { keys: "Escape", description: "Reset to the default dual-pass scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlDualPassPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlDualPassScene>(DEFAULT_WEBGL_DUAL_PASS_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the dual-pass route checks browser support and prepares the first offscreen composite workflow.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGlDualPassScene)

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
      releaseWebGlDualPassResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlDualPassScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a dual-pass WebGL composite using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlDualPassClearColor(scene) },
    { label: "Accent color", value: webGlDualPassAccentColor(scene) },
    { label: "Pass stages", value: webGlDualPassStageLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-dual-pass.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_DUAL_PASS_SCENE)
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
      case "h":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          glow: stepNumericValue(current.glow, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "k":
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
        setScene(DEFAULT_WEBGL_DUAL_PASS_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Dual Pass"
      description="A Next.js WebGL2 route that renders glowing geometry into an offscreen texture during the first pass, then composites that texture back onto the presentation canvas during the second pass."
      highlights={[
        "Introduces the first explicit offscreen framebuffer workflow in the Next.js Phase 6 track",
        "Separates geometry rendering from fullscreen composite presentation so later blur and feedback routes can build on the same render-target contract",
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
          <WorkbenchControlSection heading="Composite controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlDualPassScene
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
            ariaLabel="WebGL dual pass viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the dual-pass route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL dual pass scene"
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
            {webGlDualPassSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route establishes the offscreen-to-onscreen composite pattern that the bloom and
            feedback slices can extend without changing the broader Phase 6 workbench shell.
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
