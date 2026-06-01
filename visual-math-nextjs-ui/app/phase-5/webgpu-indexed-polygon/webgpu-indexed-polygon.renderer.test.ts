import { DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE } from "./webgpu-indexed-polygon.model"
import {
  buildWebGpuIndexedPolygonIndexData,
  buildWebGpuIndexedPolygonVertexData,
  createWebGpuIndexedPolygonSceneResources,
  webGpuIndexedPolygonIndexCount,
  webGpuIndexedPolygonVertexCount,
} from "./webgpu-indexed-polygon.scene"
import {
  releaseWebGpuIndexedPolygonResources,
  renderWebGpuIndexedPolygonScene,
} from "./webgpu-indexed-polygon.renderer"

describe("webgpu-indexed-polygon.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, INDEX: 4, COPY_DST: 2 },
    })
  })

  afterAll(() => {
    if (originalBufferUsage === undefined) {
      Reflect.deleteProperty(globalThis, "GPUBufferUsage")
      return
    }

    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: originalBufferUsage,
    })
  })

  it("builds polygon vertex and index data and allocates resources", () => {
    const runtime = createIndexedPolygonRuntime()

    const vertexData = buildWebGpuIndexedPolygonVertexData(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
    const indexData = buildWebGpuIndexedPolygonIndexData(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)
    const resources = createWebGpuIndexedPolygonSceneResources(runtime)

    expect(vertexData).toHaveLength(
      webGpuIndexedPolygonVertexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE) * 6,
    )
    expect(indexData).toHaveLength(
      webGpuIndexedPolygonIndexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE),
    )
    expect(indexData.slice(0, 6)).toEqual(new Uint16Array([0, 1, 2, 0, 2, 3]))
    expect(runtime.device.createBuffer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        label: "visual-math-nextjs-webgpu-indexed-polygon-vertices",
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    )
    expect(runtime.device.createBuffer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        label: "visual-math-nextjs-webgpu-indexed-polygon-indices",
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      }),
    )
    expect(resources.indexBuffer).toBe(runtime.indexBuffer)
  })

  it("submits an indexed draw and releases cached resources", () => {
    const runtime = createIndexedPolygonRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuIndexedPolygonScene(canvas, runtime, DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenNthCalledWith(
      1,
      runtime.vertexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.device.queue.writeBuffer).toHaveBeenNthCalledWith(
      2,
      runtime.indexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.pass.setPipeline).toHaveBeenCalledWith(runtime.pipeline)
    expect(runtime.pass.setVertexBuffer).toHaveBeenCalledWith(0, runtime.vertexBuffer)
    expect(runtime.pass.setIndexBuffer).toHaveBeenCalledWith(runtime.indexBuffer, "uint16")
    expect(runtime.pass.drawIndexed).toHaveBeenCalledWith(
      webGpuIndexedPolygonIndexCount(DEFAULT_WEBGPU_INDEXED_POLYGON_SCENE),
    )
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuIndexedPolygonResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.indexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndexedPolygonResources(runtime)).toBe(false)
  })
})

function createIndexedPolygonRuntime() {
  const shaderModule = {} as GPUShaderModule
  const pipeline = {} as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const indexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const pass = {
    setPipeline: jest.fn(),
    setVertexBuffer: jest.fn(),
    setIndexBuffer: jest.fn(),
    drawIndexed: jest.fn(),
    end: jest.fn(),
  } as unknown as GPURenderPassEncoder
  const commandBuffer = {} as GPUCommandBuffer
  const textureView = {} as GPUTextureView
  const encoder = {
    beginRenderPass: jest.fn().mockReturnValue(pass),
    finish: jest.fn().mockReturnValue(commandBuffer),
  } as unknown as GPUCommandEncoder
  const queue = {
    writeBuffer: jest.fn(),
    submit: jest.fn(),
  } as unknown as GPUQueue
  const device = {
    queue,
    createShaderModule: jest.fn().mockReturnValue(shaderModule),
    createRenderPipeline: jest.fn().mockReturnValue(pipeline),
    createBuffer: jest.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(indexBuffer),
    createCommandEncoder: jest.fn().mockReturnValue(encoder),
  } as unknown as GPUDevice
  const context = {
    getCurrentTexture: jest.fn().mockReturnValue({
      createView: jest.fn().mockReturnValue(textureView),
    }),
  } as unknown as GPUCanvasContext

  return {
    adapter: {} as GPUAdapter,
    device,
    context,
    format: "bgra8unorm",
    pipeline,
    vertexBuffer,
    indexBuffer,
    pass,
  }
}
