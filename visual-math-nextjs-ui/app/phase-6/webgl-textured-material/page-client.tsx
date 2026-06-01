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
  DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
  isWebGlTexturedMaterialScene,
  type WebGlTexturedMaterialScene,
  webGlTexturedMaterialBaseColor,
  webGlTexturedMaterialClearColor,
  webGlTexturedMaterialFinishLabel,
  webGlTexturedMaterialLightDirection,
  webGlTexturedMaterialSummary,
} from "./webgl-textured-material.model"
import {
  releaseWebGlTexturedMaterialResources,
  renderWebGlTexturedMaterialScene,
} from "./webgl-textured-material.renderer"

const ROUTE_PATH = "/phase-6/webgl-textured-material"
const RANGE_CONTROLS: readonly RangeControlSchema[] = [
  { kind: "range", id: "red", label: "Red channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "green", label: "Green channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "blue", label: "Blue channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "alpha", label: "Alpha channel", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "textureMix", label: "Texture mix", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "relief", label: "Relief", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "gloss", label: "Gloss", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightX", label: "Light X", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "lightY", label: "Light Y", min: 0, max: 1, step: 0.01 },
  { kind: "range", id: "fill", label: "Fill", min: 0, max: 1, step: 0.01 },
]
const PRESETS: readonly WorkbenchPreset<WebGlTexturedMaterialScene>[] = [
  {
    label: "Gallery ceramic",
    description: "Balanced albedo texture and relief with a soft fill for a calmer studio read.",
    state: {
      red: 0.04,
      green: 0.06,
      blue: 0.1,
      alpha: 1,
      warmth: 0.58,
      textureMix: 0.74,
      relief: 0.46,
      gloss: 0.52,
      lightX: 0.78,
      lightY: 0.7,
      fill: 0.34,
    },
  },
  {
    label: "Embossed alloy",
    description: "Higher texture and gloss with more relief for sharper material separation.",
    state: {
      red: 0.03,
      green: 0.05,
      blue: 0.09,
      alpha: 1,
      warmth: 0.66,
      textureMix: 0.88,
      relief: 0.72,
      gloss: 0.78,
      lightX: 0.86,
      lightY: 0.74,
      fill: 0.42,
    },
  },
  {
    label: "Soft fresco",
    description:
      "Lower texture and gloss with brighter fill for a flatter painted material response.",
    state: {
      red: 0.05,
      green: 0.08,
      blue: 0.12,
      alpha: 1,
      warmth: 0.72,
      textureMix: 0.38,
      relief: 0.28,
      gloss: 0.24,
      lightX: 0.62,
      lightY: 0.82,
      fill: 0.68,
    },
  },
]
const ACTIONS: readonly WorkbenchAction[] = [
  {
    id: "copy-share-link",
    label: "Copy share link",
    description: "Copy a URL with the current serialized WebGL textured-material scene.",
  },
  {
    id: "export-png",
    label: "Export PNG",
    description: "Download the current WebGL textured-material viewport as a PNG image.",
  },
  {
    id: "reset-scene",
    label: "Reset",
    description: "Restore the default WebGL textured-material scene.",
  },
]
const KEYBOARD_SHORTCUTS: readonly WorkbenchKeyboardShortcut[] = [
  { keys: "R / Shift+R", description: "Increase or decrease the red channel." },
  { keys: "G / Shift+G", description: "Increase or decrease the green channel." },
  { keys: "B / Shift+B", description: "Increase or decrease the blue channel." },
  { keys: "A / Shift+A", description: "Increase or decrease the alpha channel." },
  { keys: "W / Shift+W", description: "Increase or decrease warmth." },
  { keys: "T / Shift+T", description: "Increase or decrease texture mix." },
  { keys: "E / Shift+E", description: "Increase or decrease relief." },
  { keys: "L / Shift+L", description: "Increase or decrease gloss." },
  { keys: "X / Shift+X", description: "Increase or decrease light X." },
  { keys: "Y / Shift+Y", description: "Increase or decrease light Y." },
  { keys: "F / Shift+F", description: "Increase or decrease fill light." },
  { keys: "Escape", description: "Reset to the default textured-material scene." },
]

type RuntimeState = "checking" | "ready" | "unsupported"

export function WebGlTexturedMaterialPageClient(props: {
  readonly serializedScene: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const initializationStarted = useRef(false)
  const [scene, setScene] = useState<WebGlTexturedMaterialScene>(
    DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE,
  )
  const [runtime, setRuntime] = useState<WebGlCanvasRuntime | null>(null)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("checking")
  const [statusMessage, setStatusMessage] = useState(
    "Mounting the textured-material route checks browser support and prepares the first texture-backed material pass.",
  )
  const [hasLoadedSearchState, setHasLoadedSearchState] = useState(false)

  useEffect(() => {
    if (!props.serializedScene || hasLoadedSearchState) {
      return
    }

    const initialScene = deserializeWorkbenchScene(
      props.serializedScene,
      isWebGlTexturedMaterialScene,
    )

    if (initialScene) {
      setScene({
        red: clampChannel(initialScene.red),
        green: clampChannel(initialScene.green),
        blue: clampChannel(initialScene.blue),
        alpha: clampChannel(initialScene.alpha),
        warmth: clampChannel(initialScene.warmth),
        textureMix: clampChannel(initialScene.textureMix),
        relief: clampChannel(initialScene.relief),
        gloss: clampChannel(initialScene.gloss),
        lightX: clampChannel(initialScene.lightX),
        lightY: clampChannel(initialScene.lightY),
        fill: clampChannel(initialScene.fill),
      })
      setStatusMessage("Loaded the textured-material scene from the shared URL.")
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
      releaseWebGlTexturedMaterialResources(runtime)
    }
  }, [runtime])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas || !runtime) {
      return
    }

    renderWebGlTexturedMaterialScene(canvas, runtime, scene)
    setStatusMessage(`Rendered a textured WebGL material pass using ${runtime.version}.`)
  }, [runtime, scene])

  const metrics = [
    { label: "Runtime", value: runtimeStatusLabel(runtimeState) },
    { label: "Context version", value: runtime?.version ?? "Unavailable" },
    { label: "Clear color", value: webGlTexturedMaterialClearColor(scene) },
    { label: "Base color", value: webGlTexturedMaterialBaseColor(scene) },
    { label: "Light direction", value: webGlTexturedMaterialLightDirection(scene) },
    { label: "Finish", value: webGlTexturedMaterialFinishLabel(scene) },
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
          ? downloadWorkbenchCanvas(canvasRef.current, "webgl-textured-material.png")
          : false
        setStatusMessage(
          didDownload ? "PNG export started." : "PNG export is unavailable in this environment.",
        )
        break
      }
      default:
        setScene(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)
        setStatusMessage("Textured-material scene reset to the default preset.")
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
      case "t":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          textureMix: stepNumericValue(
            current.textureMix,
            event.shiftKey ? -0.05 : 0.05,
            clampChannel,
          ),
        }))
        break
      case "e":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          relief: stepNumericValue(current.relief, event.shiftKey ? -0.05 : 0.05, clampChannel),
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
      case "f":
        event.preventDefault()
        setScene((current) => ({
          ...current,
          fill: stepNumericValue(current.fill, event.shiftKey ? -0.05 : 0.05, clampChannel),
        }))
        break
      case "escape":
        event.preventDefault()
        setScene(DEFAULT_WEBGL_TEXTURED_MATERIAL_SCENE)
        break
      default:
        break
    }
  }

  return (
    <MathWorkbench
      eyebrow="Phase 6"
      title="WebGL Textured Material"
      description="A Next.js WebGL2 route that uploads a procedural albedo texture, derives relief normals from neighboring texels, and shades the result with primary and fill lights."
      highlights={[
        "Combines the earlier texture-upload path with the recent material and relief lighting slices into the first texture-backed shaded material study",
        "Adds texture-mix and fill-light controls so the route can shift between painted and embossed material reads without changing the shared workbench contract",
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
              const sceneKey = control.id as keyof WebGlTexturedMaterialScene
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
            ariaLabel="WebGL textured material viewport"
            onKeyDown={handleViewportKeydown}
          >
            {runtimeState === "unsupported" ? (
              <div className="vm-copy" role="status">
                WebGL2 is unavailable in this environment, so the textured-material route is showing
                a fallback message instead of a GPU-backed viewport.
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="vm-canvas"
                aria-label="Canvas showing the current WebGL textured material scene"
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
            {webGlTexturedMaterialSummary(
              scene,
              runtimeStatusLabel(runtimeState),
              runtime?.version,
            )}
          </p>
          <p className="vm-copy">
            This route sets the texture-backed shading baseline that the later dual-pass and bloom
            slices can reuse when the Phase 6 pipeline expands beyond single-pass rendering.
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
