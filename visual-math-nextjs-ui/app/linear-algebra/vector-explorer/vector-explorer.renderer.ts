import { getCanvas2dContext } from "@/app/shared/canvas/canvas-runtime"

import type { VectorScene } from "./vector-explorer.model"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const GRID_SPACING = 32

export function renderVectorScene(canvas: HTMLCanvasElement, scene: VectorScene): void {
  const context = getCanvas2dContext(canvas)

  if (!context) {
    return
  }

  const pixelRatio = globalThis.devicePixelRatio ?? 1

  if (canvas.width !== CANVAS_WIDTH * pixelRatio || canvas.height !== CANVAS_HEIGHT * pixelRatio) {
    canvas.width = CANVAS_WIDTH * pixelRatio
    canvas.height = CANVAS_HEIGHT * pixelRatio
    canvas.style.width = `${CANVAS_WIDTH}px`
    canvas.style.height = `${CANVAS_HEIGHT}px`
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  drawBackground(context)
  drawGrid(context)
  drawAxes(context, scene.basisVisible)
  drawVector(context, scene)
}

function drawBackground(context: CanvasRenderingContext2D): void {
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  gradient.addColorStop(0, "#fff8eb")
  gradient.addColorStop(1, "#eef6ff")
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawGrid(context: CanvasRenderingContext2D): void {
  context.save()
  context.strokeStyle = "rgba(19, 33, 59, 0.09)"
  context.lineWidth = 1

  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SPACING) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, CANVAS_HEIGHT)
    context.stroke()
  }

  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SPACING) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(CANVAS_WIDTH, y)
    context.stroke()
  }

  context.restore()
}

function drawAxes(context: CanvasRenderingContext2D, basisVisible: boolean): void {
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2

  context.save()
  context.strokeStyle = "#13213b"
  context.lineWidth = 1.5

  context.beginPath()
  context.moveTo(0, centerY)
  context.lineTo(CANVAS_WIDTH, centerY)
  context.moveTo(centerX, 0)
  context.lineTo(centerX, CANVAS_HEIGHT)
  context.stroke()

  if (basisVisible) {
    context.fillStyle = "#13213b"
    context.font = "600 14px Avenir Next"
    context.fillText("i", CANVAS_WIDTH - 20, centerY - 10)
    context.fillText("j", centerX + 10, 18)
  }

  context.restore()
}

function drawVector(context: CanvasRenderingContext2D, scene: VectorScene): void {
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const targetX = centerX + scene.vector.x * GRID_SPACING
  const targetY = centerY - scene.vector.y * GRID_SPACING

  if (scene.projectionVisible) {
    context.save()
    context.setLineDash([8, 6])
    context.strokeStyle = "rgba(48, 103, 140, 0.7)"
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(centerX, centerY)
    context.lineTo(targetX, centerY)
    context.lineTo(targetX, targetY)
    context.stroke()
    context.restore()
  }

  context.save()
  context.strokeStyle = "#bf5b04"
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(centerX, centerY)
  context.lineTo(targetX, targetY)
  context.stroke()

  const angle = Math.atan2(targetY - centerY, targetX - centerX)
  const arrowSize = 14
  context.fillStyle = "#bf5b04"
  context.beginPath()
  context.moveTo(targetX, targetY)
  context.lineTo(
    targetX - arrowSize * Math.cos(angle - Math.PI / 6),
    targetY - arrowSize * Math.sin(angle - Math.PI / 6),
  )
  context.lineTo(
    targetX - arrowSize * Math.cos(angle + Math.PI / 6),
    targetY - arrowSize * Math.sin(angle + Math.PI / 6),
  )
  context.closePath()
  context.fill()

  context.fillStyle = "#13213b"
  context.font = "600 14px Avenir Next"
  context.fillText(
    `v = (${scene.vector.x.toFixed(1)}, ${scene.vector.y.toFixed(1)})`,
    targetX + 12,
    targetY - 12,
  )
  context.restore()
}
