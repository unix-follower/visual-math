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
  DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE,
  isWebGlFeedbackTrailsScene,
  type WebGlFeedbackTrailsScene,
  webGlFeedbackTrailRelayCount,
  webGlFeedbackTrailsAccentColor,
  webGlFeedbackTrailsClearColor,
  webGlFeedbackTrailsStageLabel,
  webGlFeedbackTrailsSummary,
} from "./webgl-feedback-trails.model"
import {
  releaseWebGlFeedbackTrailsResources,
  renderWebGlFeedbackTrailsScene,
} from "./webgl-feedback-trails.renderer"

const ROUTE_PATH = "/phase-6/webgl-feedback-trails"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "glow", label: "Seed glow", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "drift", label: "Trail drift", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "decay", label: "Trail decay", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "relays", label: "Relay depth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "mix", label: "Composite mix", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlFeedbackTrailsScene>[] = [
  {
    label: "Aurora streak",
    description: "Balanced relay depth with a readable trail field.",
    state: {
      red: 0.03,
      green: 0.08,
      blue: 0.16,
      alpha: 1,
      glow: 0.76,
      drift: 0.34,
      decay: 0.58,
      relays: 0.54,
      mix: 0.68,
    },
  },
  {
    label: "Heat ribbon",
    description: "Hotter seed with shorter but brighter relays.",
    state: {
      red: 0.12,
      green: 0.07,
      blue: 0.06,
      alpha: 1,
      glow: 0.92,
      drift: 0.22,
      decay: 0.72,
      relays: 0.32,
      mix: 0.82,
    },
  },
  {
    label: "Cold wake",
    description: "Cool background with longer chains and softer decay.",
    state: {
      red: 0.02,
      green: 0.08,
      blue: 0.22,
      alpha: 1,
      glow: 0.46,
      drift: 0.58,
      decay: 0.38,
      relays: 0.88,
      mix: 0.44,
    },
  },
  {
    label: "Glass traces",
    description: "Lower alpha and quieter relay energy for gentler trails.",
    state: {
      red: 0.08,
      green: 0.12,
      blue: 0.18,
      alpha: 0.76,
      glow: 0.34,
      drift: 0.28,
      decay: 0.48,
      relays: 0.42,
      mix: 0.28,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL feedback trails scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current feedback trails viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default feedback trails scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease the seed glow." },
  { keys: "S / Shift+S", description: "Increase or decrease the trail drift." },
  { keys: "D / Shift+D", description: "Increase or decrease the trail decay." },
  { keys: "F / Shift+F", description: "Increase or decrease relay depth." },
  { keys: "N / Shift+N", description: "Increase or decrease the composite mix." },
  { keys: "Escape", description: "Reset to the default feedback trails scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlFeedbackTrailsPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlFeedbackTrailsScene>(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the WebGL feedback trails route prepares the seeded pass, repeated relays, and a final composite pass.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlFeedbackTrailsScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        glow: clampChannel(initialScene.glow),
        drift: clampChannel(initialScene.drift),
        decay: clampChannel(initialScene.decay),
        relays: clampChannel(initialScene.relays),
        mix: clampChannel(initialScene.mix),
      })
      setStatusMessage("Loaded the WebGL feedback trails scene from the shared URL.")
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
      releaseWebGlFeedbackTrailsResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlFeedbackTrailsScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a feedback-trail WebGL composite using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlFeedbackTrailsClearColor(scene) },
    { label: "Accent color", value: webGlFeedbackTrailsAccentColor(scene) },
    { label: "Stages", value: webGlFeedbackTrailsStageLabel(scene) },
    { label: "Relay count", value: `${webGlFeedbackTrailRelayCount(scene)}` },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-feedback-trails.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)
        setStatusMessage("WebGL feedback trails scene reset to the default preset.")
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
          drift: stepNumericValue(current.drift, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "d":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          decay: stepNumericValue(current.decay, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "f":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          relays: stepNumericValue(current.relays, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "n":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          mix: stepNumericValue(current.mix, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Feedback Trails"
      description="A Next.js WebGL2 route that seeds one offscreen target, relays the image repeatedly across the same two ping-pong textures, and then composites the returned trail field onto the presentation canvas."
      highlights={[
        "First Next.js Phase 6 route that extends one feedback bounce into a longer relay chain across the same two offscreen targets",
        "Keeps the repeated post-process program wiring local by reusing the shared render-target and fullscreen post-process helpers already established by Dual Pass, Bloom Blur, and Ping-Pong Feedback",
        "Extends the current WebGL baseline toward richer persistence and temporal effects without changing the shared workbench contract",
      ]}
      actions={ACTIONS}
      keyboardShortcuts={KEYBOARD_SHORTCUTS}
      statusMessage={statusMessage}
      onAction={(actionId) => {
        void handleAction(actionId)
      }}
      controls={
        <>
          <WorkbenchControlSection heading="Trail controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlFeedbackTrailsScene
              const value = scene[sceneKey]
              const displayValue =
                control.id === "relays"
                  ? `${webGlFeedbackTrailRelayCount({ ...scene, relays: value })} passes`
                  : value.toFixed(2)

              return (
                <WorkbenchRangeControl
                  key={control.id}
                  control={control}
                  value={value}
                  displayValue={displayValue}
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
            ariaLabel="WebGL feedback trails viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the feedback trails route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL feedback trails scene"
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
            {webGlFeedbackTrailsSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route stretches the earlier ping-pong baseline into a longer relay chain so the
            later temporal-feedback slices can evolve from a verified multi-pass contract instead of
            starting over.
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
