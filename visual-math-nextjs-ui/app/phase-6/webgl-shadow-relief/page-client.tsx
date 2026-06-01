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
  DEFAULT_WEBGL_SHADOW_RELIEF_SCENE,
  isWebGlShadowReliefScene,
  type WebGlShadowReliefScene,
  webGlShadowReliefBaseColor,
  webGlShadowReliefClearColor,
  webGlShadowReliefFinishLabel,
  webGlShadowReliefLightDirection,
  webGlShadowReliefSummary,
} from "./webgl-shadow-relief.model"
import {
  releaseWebGlShadowReliefResources,
  renderWebGlShadowReliefScene,
} from "./webgl-shadow-relief.renderer"

const ROUTE_PATH = "/phase-6/webgl-shadow-relief"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "relief", label: "Relief", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "shadow", label: "Shadow", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "gloss", label: "Gloss", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightX", label: "Light X", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightY", label: "Light Y", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlShadowReliefScene>[] = [
  {
    label: "Soft bas relief",
    description: "Balanced relief and shadow cues with a warm studio finish.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      warmth: 0.64,
      relief: 0.58,
      shadow: 0.52,
      gloss: 0.44,
      lightX: 0.76,
      lightY: 0.72,
    },
  },
  {
    label: "Deep engraving",
    description: "Higher relief and shadow with a lower gloss for stronger carved contrast.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      warmth: 0.56,
      relief: 0.82,
      shadow: 0.78,
      gloss: 0.22,
      lightX: 0.84,
      lightY: 0.68,
    },
  },
  {
    label: "Glossed plaster",
    description: "Lower shadow with brighter warmth and gloss for a smoother relief read.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.12,
      alpha: 1,
      warmth: 0.74,
      relief: 0.42,
      shadow: 0.28,
      gloss: 0.72,
      lightX: 0.62,
      lightY: 0.8,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL shadow-relief scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL shadow-relief viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL shadow-relief scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease warmth." },
  { keys: "E / Shift+E", description: "Increase or decrease relief." },
  { keys: "S / Shift+S", description: "Increase or decrease shadow depth." },
  { keys: "L / Shift+L", description: "Increase or decrease gloss." },
  { keys: "X / Shift+X", description: "Increase or decrease light X." },
  { keys: "Y / Shift+Y", description: "Increase or decrease light Y." },
  { keys: "Escape", description: "Reset to the default shadow-relief scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlShadowReliefPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlShadowReliefScene>(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the shadow-relief route checks browser support and prepares the first relief-shaded material pass.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGlShadowReliefScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        warmth: clampChannel(initialScene.warmth),
        relief: clampChannel(initialScene.relief),
        shadow: clampChannel(initialScene.shadow),
        gloss: clampChannel(initialScene.gloss),
        lightX: clampChannel(initialScene.lightX),
        lightY: clampChannel(initialScene.lightY),
      })
      setStatusMessage("Loaded the shadow-relief scene from the shared URL.")
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
      releaseWebGlShadowReliefResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlShadowReliefScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a relief-shaded WebGL material pass using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlShadowReliefClearColor(scene) },
    { label: "Base color", value: webGlShadowReliefBaseColor(scene) },
    { label: "Light direction", value: webGlShadowReliefLightDirection(scene) },
    { label: "Finish", value: webGlShadowReliefFinishLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-shadow-relief.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)
        setStatusMessage("Shadow-relief scene reset to the default preset.")
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
          warmth: stepNumericValue(current.warmth, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "e":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          relief: stepNumericValue(current.relief, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "s":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          shadow: stepNumericValue(current.shadow, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "l":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          gloss: stepNumericValue(current.gloss, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "x":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          lightX: stepNumericValue(current.lightX, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "y":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          lightY: stepNumericValue(current.lightY, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_SHADOW_RELIEF_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Shadow Relief"
      description="A Next.js WebGL2 route that derives normals from a procedural height field and shades them with directional light, self-shadow cues, and glossy relief highlights."
      highlights={[
        "Extends the lit-material slice with procedural height-derived normals and contact-shadow style relief shading",
        "Keeps the fullscreen material-pass structure while adding relief, shadow, and gloss controls for a more sculpted fragment response",
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
          <WorkbenchControlSection heading="Relief controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlShadowReliefScene
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
            ariaLabel="WebGL shadow relief viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the shadow-relief route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL shadow relief scene"
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
            {webGlShadowReliefSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route adds relief-driven shading and contact-shadow cues so the next Phase 6
            textured material slice can build on a more sculpted fragment-lighting baseline.
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
