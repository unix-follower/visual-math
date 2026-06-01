import { DEFAULT_WEBGPU_FOUNDATION_SCENE } from "./webgpu-foundation.model"
import {
  buildWebGpuFoundationVertexData,
  createWebGpuFoundationSceneResources,
  webGpuFoundationVertexCount,
} from "./webgpu-foundation-scene"
import {
  releaseWebGpuFoundationResources,
  renderWebGpuFoundationScene,
} from "./webgpu-foundation.renderer"

describe("webgpu-foundation.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, COPY_DST: 2 },
    })
  })

  afterAll(() => {
    if (originalBufferUsage === undefined) {
      // @ts-expect-error test cleanup for optional global
      delete globalThis.GPUBufferUsage
      return
    }

    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: originalBufferUsage,
    })
  })

  it("builds triangle vertex data and allocates scene resources", () => {
    const runtime = createFoundationRuntime()

    const vertexData = buildWebGpuFoundationVertexData(DEFAULT_WEBGPU_FOUNDATION_SCENE)
    const resources = createWebGpuFoundationSceneResources(runtime)

    expect(vertexData).toHaveLength(webGpuFoundationVertexCount() * 6)
    expect(vertexData[1]).toBeCloseTo(0.434, 3)
    expect(runtime.device.createBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "visual-math-nextjs-webgpu-foundation-vertices",
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    )
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
  })

  it("submits a draw and releases cached resources", () => {
    const runtime = createFoundationRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuFoundationScene(canvas, runtime, DEFAULT_WEBGPU_FOUNDATION_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledWith(
      runtime.vertexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.pass.setPipeline).toHaveBeenCalledWith(runtime.pipeline)
    expect(runtime.pass.setVertexBuffer).toHaveBeenCalledWith(0, runtime.vertexBuffer)
    expect(runtime.pass.draw).toHaveBeenCalledWith(3)
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuFoundationResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuFoundationResources(runtime)).toBe(false)
  })
})

function createFoundationRuntime() {
  const shaderModule = {} as GPUShaderModule
  const pipeline = {} as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const pass = {
    setPipeline: jest.fn(),
    setVertexBuffer: jest.fn(),
    draw: jest.fn(),
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
    createBuffer: jest.fn().mockReturnValue(vertexBuffer),
    createCommandEncoder: jest.fn().mockReturnValue(encoder),
  } as unknown as GPUDevice
  const context = {
    getCurrentTexture: jest.fn().mockReturnValue({
      createView: jest.fn().mockReturnValue(textureView),
    }),
  } as unknown as GPUCanvasContext
  const runtime = {
    adapter: {} as GPUAdapter,
    device,
    context,
    format: "bgra8unorm",
    pipeline,
    vertexBuffer,
    pass,
  }

  return runtime
}
