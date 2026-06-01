import { DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE } from "./webgpu-indirect-ribbon.model"
import {
  buildWebGpuIndirectRibbonDrawData,
  buildWebGpuIndirectRibbonVertexData,
  createWebGpuIndirectRibbonSceneResources,
} from "./webgpu-indirect-ribbon.scene"
import {
  releaseWebGpuIndirectRibbonResources,
  renderWebGpuIndirectRibbonScene,
} from "./webgpu-indirect-ribbon.renderer"

describe("webgpu-indirect-ribbon.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, INDIRECT: 4, COPY_DST: 2 },
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

  it("builds indirect ribbon data and allocates scene resources", () => {
    const runtime = createIndirectRibbonRuntime()

    const vertexData = buildWebGpuIndirectRibbonVertexData(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
    const drawData = buildWebGpuIndirectRibbonDrawData(DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)
    const resources = createWebGpuIndirectRibbonSceneResources(
      runtime,
      DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE,
    )

    expect(vertexData).toHaveLength(36)
    expect(drawData).toEqual(new Uint32Array([6, 2, 0, 0]))
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(resources.indirectBuffer).toBe(runtime.indirectBuffer)
  })

  it("submits an indirect draw and releases cached resources", () => {
    const runtime = createIndirectRibbonRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuIndirectRibbonScene(canvas, runtime, DEFAULT_WEBGPU_INDIRECT_RIBBON_SCENE)

    expect(runtime.pass.drawIndirect).toHaveBeenCalledWith(runtime.indirectBuffer, 0)
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndirectRibbonResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.indirectBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuIndirectRibbonResources(runtime)).toBe(false)
  })
})

function createIndirectRibbonRuntime() {
  const shaderModule = {} as GPUShaderModule
  const pipeline = {} as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const indirectBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const pass = {
    setPipeline: jest.fn(),
    setVertexBuffer: jest.fn(),
    drawIndirect: jest.fn(),
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
    createBuffer: jest.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(indirectBuffer),
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
    pipeline,
    vertexBuffer,
    indirectBuffer,
    pass,
  }
}
