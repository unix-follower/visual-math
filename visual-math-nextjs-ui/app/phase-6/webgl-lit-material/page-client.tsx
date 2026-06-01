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
  DEFAULT_WEBGL_LIT_MATERIAL_SCENE,
  isWebGlLitMaterialScene,
  type WebGlLitMaterialScene,
  webGlLitMaterialBaseColor,
  webGlLitMaterialClearColor,
  webGlLitMaterialFinishLabel,
  webGlLitMaterialLightDirection,
  webGlLitMaterialSummary,
} from "./webgl-lit-material.model"
import {
  releaseWebGlLitMaterialResources,
  renderWebGlLitMaterialScene,
} from "./webgl-lit-material.renderer"

const ROUTE_PATH = "/phase-6/webgl-lit-material"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "metalness", label: "Metalness", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "roughness", label: "Roughness", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightX", label: "Light X", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightY", label: "Light Y", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "rim", label: "Rim", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlLitMaterialScene>[] = [
  {
    label: "Polished orb",
    description: "Balanced warmth and metalness with a slightly elevated light for a glossy read.",
    state: {
      red: 0.05,
      green: 0.07,
      blue: 0.11,
      alpha: 1,
      warmth: 0.62,
      metalness: 0.46,
      roughness: 0.34,
      lightX: 0.78,
      lightY: 0.72,
      rim: 0.38,
    },
  },
  {
    label: "Soft ceramic",
    description: "Lower metalness and broader roughness for a diffuse studio material response.",
    state: {
      red: 0.06,
      green: 0.08,
      blue: 0.12,
      alpha: 1,
      warmth: 0.48,
      metalness: 0.16,
      roughness: 0.72,
      lightX: 0.6,
      lightY: 0.68,
      rim: 0.22,
    },
  },
  {
    label: "Neon alloy",
    description:
      "Higher metalness, lower roughness, and stronger rim light for a sharper highlight band.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      warmth: 0.74,
      metalness: 0.84,
      roughness: 0.14,
      lightX: 0.9,
      lightY: 0.82,
      rim: 0.66,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL lit-material scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL lit-material viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL lit-material scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease warmth." },
  { keys: "M / Shift+M", description: "Increase or decrease metalness." },
  { keys: "O / Shift+O", description: "Increase or decrease roughness." },
  { keys: "X / Shift+X", description: "Increase or decrease light X." },
  { keys: "Y / Shift+Y", description: "Increase or decrease light Y." },
  { keys: "I / Shift+I", description: "Increase or decrease rim light." },
  { keys: "Escape", description: "Reset to the default lit-material scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlLitMaterialPageClient(props: { readonly serializedScene: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlLitMaterialScene>(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the lit-material route checks browser support and prepares a fragment-lit material pass.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(props.serializedScene, isWebGlLitMaterialScene)

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        warmth: clampChannel(initialScene.warmth),
        metalness: clampChannel(initialScene.metalness),
        roughness: clampChannel(initialScene.roughness),
        lightX: clampChannel(initialScene.lightX),
        lightY: clampChannel(initialScene.lightY),
        rim: clampChannel(initialScene.rim),
      })
      setStatusMessage("Loaded the lit-material scene from the shared URL.")
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
      releaseWebGlLitMaterialResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlLitMaterialScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a lit WebGL material pass using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlLitMaterialClearColor(scene) },
    { label: "Base color", value: webGlLitMaterialBaseColor(scene) },
    { label: "Light direction", value: webGlLitMaterialLightDirection(scene) },
    { label: "Finish", value: webGlLitMaterialFinishLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-lit-material.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)
        setStatusMessage("Lit-material scene reset to the default preset.")
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
      case "m":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          metalness: stepNumericValue(
            current.metalness,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "o":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          roughness: stepNumericValue(
            current.roughness,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
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
      case "i":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          rim: stepNumericValue(current.rim, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_LIT_MATERIAL_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Lit Material"
      description="A Next.js WebGL2 route that shades a procedural orb in the fragment shader with diffuse, metallic, specular, and rim-light responses."
      highlights={[
        "First Next.js Phase 6 route to move from face-colored solids into a material-style fragment shading model",
        "Reuses the shared WebGL bootstrap and buffer helpers while introducing a route-local lighting and finish response on a fullscreen procedural orb",
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
          <WorkbenchControlSection heading="Material controls">
            {RANGE_CONTROLS.map((control) => {
              const sceneKey = control.id as keyof WebGlLitMaterialScene
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
            ariaLabel="WebGL lit material viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the lit-material route is showing a
                fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL lit material scene"
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
            {webGlLitMaterialSummary(scene, runtimeStatusLabel(runtimeState), runtime?.version)}
          </p>
          <p className="vm-copy">
            This route turns the earlier solid geometry baseline into a material study so later
            Phase 6 lighting and texture routes can build on tested diffuse, specular, and rim-lit
            shading behavior.
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
