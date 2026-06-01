import { DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE } from "./webgpu-indirect-indexed-polygon.model"
import {
  buildWebGpuIndirectIndexedPolygonDrawData,
  buildWebGpuIndirectIndexedPolygonIndexData,
  buildWebGpuIndirectIndexedPolygonVertexData,
  createWebGpuIndirectIndexedPolygonSceneResources,
} from "./webgpu-indirect-indexed-polygon.scene"
import {
  releaseWebGpuIndirectIndexedPolygonResources,
  renderWebGpuIndirectIndexedPolygonScene,
} from "./webgpu-indirect-indexed-polygon.renderer"

describe("webgpu-indirect-indexed-polygon.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, INDEX: 2, INDIRECT: 4, COPY_DST: 8 },
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

  it("builds indirect indexed data and allocates resources", () => {
    const runtime = createIndirectIndexedRuntime()

    const vertexData = buildWebGpuIndirectIndexedPolygonVertexData(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )
    const indexData = buildWebGpuIndirectIndexedPolygonIndexData(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )
    const drawData = buildWebGpuIndirectIndexedPolygonDrawData(
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )
    const resources = createWebGpuIndirectIndexedPolygonSceneResources(runtime)

    expect(vertexData).toHaveLength(48)
    expect(indexData).toHaveLength(21)
    expect(drawData).toEqual(new Uint32Array([15, 1, 0, 0, 0]))
    expect(resources.indirectBuffer).toBe(runtime.indirectBuffer)
  })

  it("submits an indirect indexed draw and releases cached resources", () => {
    const runtime = createIndirectIndexedRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuIndirectIndexedPolygonScene(
      canvas,
      runtime,
      DEFAULT_WEBGPU_INDIRECT_INDEXED_POLYGON_SCENE,
    )

    expect(runtime.pass.setIndexBuffer).toHaveBeenCalledWith(runtime.indexBuffer, "uint16")
    expect(runtime.pass.drawIndexedIndirect).toHaveBeenCalledWith(runtime.indirectBuffer, 0)
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuIndirectIndexedPolygonResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.indexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.indirectBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndirectIndexedPolygonResources(runtime)).toBe(false)
  })
})

function createIndirectIndexedRuntime() {
  const shaderModule = {} as GPUShaderModule
  const pipeline = {} as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const indexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const indirectBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const pass = {
    setPipeline: jest.fn(),
    setVertexBuffer: jest.fn(),
    setIndexBuffer: jest.fn(),
    drawIndexedIndirect: jest.fn(),
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
    createBuffer: jest
      .fn()
      .mockReturnValueOnce(vertexBuffer)
      .mockReturnValueOnce(indexBuffer)
      .mockReturnValueOnce(indirectBuffer),
    createCommandEncoder: jest.fn().mockReturnValue(encoder),
  } as unknown as GPUDevice
  const context = {
    getCurrentTexture: jest
      .fn()
      .mockReturnValue({ createView: jest.fn().mockReturnValue(textureView) }),
  } as unknown as GPUCanvasContext

  return {
    adapter: {} as GPUAdapter,
    device,
    context,
    format: "bgra8unorm",
    vertexBuffer,
    indexBuffer,
    indirectBuffer,
    pass,
  }
}
