import { type WebGpuCanvasRuntime } from "@/app/shared/webgpu/webgpu-bootstrap"
import {
  getOrCreateCachedWebGpuResources,
  releaseCachedWebGpuResources,
  syncWebGpuCanvasSize,
} from "@/app/shared/webgpu/webgpu-renderer-resources"

import { type WebGpuIndirectIndexedPolygonScene } from "./webgpu-indirect-indexed-polygon.model"
import {
  buildWebGpuIndirectIndexedPolygonDrawData,
  buildWebGpuIndirectIndexedPolygonIndexData,
  buildWebGpuIndirectIndexedPolygonVertexData,
  createWebGpuIndirectIndexedPolygonSceneResources,
  type WebGpuIndirectIndexedPolygonSceneResources,
  toArrayBuffer,
} from "./webgpu-indirect-indexed-polygon.scene"

const CANVAS_WIDTH = 720
const CANVAS_HEIGHT = 480
const RESOURCE_CACHE = new WeakMap<
  WebGpuCanvasRuntime,
  WebGpuIndirectIndexedPolygonSceneResources
>()

export function renderWebGpuIndirectIndexedPolygonScene(
  canvas: HTMLCanvasElement,
  runtime: WebGpuCanvasRuntime,
  scene: WebGpuIndirectIndexedPolygonScene,
): void {
  syncWebGpuCanvasSize(canvas, CANVAS_WIDTH, CANVAS_HEIGHT)

  const resources = getOrCreateResources(runtime)

  runtime.device.queue.writeBuffer(
    resources.vertexBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectIndexedPolygonVertexData(scene)),
  )
  runtime.device.queue.writeBuffer(
    resources.indexBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectIndexedPolygonIndexData(scene)),
  )
  runtime.device.queue.writeBuffer(
    resources.indirectBuffer,
    0,
    toArrayBuffer(buildWebGpuIndirectIndexedPolygonDrawData(scene)),
  )

  const encoder = runtime.device.createCommandEncoder({
    label: "visual-math-nextjs-webgpu-indirect-indexed-polygon-command-encoder",
  })
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: runtime.context.getCurrentTexture().createView(),
        clearValue: {
          r: scene.red,
          g: scene.green,
          b: scene.blue,
          a: scene.alpha,
        },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  })

  pass.setPipeline(resources.pipeline)
  pass.setVertexBuffer(0, resources.vertexBuffer)
  pass.setIndexBuffer(resources.indexBuffer, "uint16")
  pass.drawIndexedIndirect(resources.indirectBuffer, 0)
  pass.end()

  runtime.device.queue.submit([
    encoder.finish({
      label: "visual-math-nextjs-webgpu-indirect-indexed-polygon-command-buffer",
    }),
  ])
}

export function releaseWebGpuIndirectIndexedPolygonResources(
  runtime: WebGpuCanvasRuntime,
): boolean {
  return releaseCachedWebGpuResources(RESOURCE_CACHE, runtime, (resources) => {
    resources.vertexBuffer.destroy?.()
    resources.indexBuffer.destroy?.()
    resources.indirectBuffer.destroy?.()
  })
}

function getOrCreateResources(
  runtime: WebGpuCanvasRuntime,
): WebGpuIndirectIndexedPolygonSceneResources {
  return getOrCreateCachedWebGpuResources(RESOURCE_CACHE, runtime, () =>
    createWebGpuIndirectIndexedPolygonSceneResources(runtime),
  )
}
