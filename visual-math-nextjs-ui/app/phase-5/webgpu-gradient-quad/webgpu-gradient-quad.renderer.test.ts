import { DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE } from "./webgpu-gradient-quad.model"
import {
  buildWebGpuGradientQuadVertexData,
  createWebGpuGradientQuadSceneResources,
  webGpuGradientQuadVertexCount,
} from "./webgpu-gradient-quad.scene"
import {
  releaseWebGpuGradientQuadResources,
  renderWebGpuGradientQuadScene,
} from "./webgpu-gradient-quad.renderer"

describe("webgpu-gradient-quad.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, COPY_DST: 2 },
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

  it("builds quad vertex data and allocates scene resources", () => {
    const runtime = createGradientQuadRuntime()

    const vertexData = buildWebGpuGradientQuadVertexData(DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)
    const resources = createWebGpuGradientQuadSceneResources(runtime)

    expect(vertexData).toHaveLength(webGpuGradientQuadVertexCount() * 6)
    expect(vertexData[0]).toBeCloseTo(-0.744, 3)
    expect(vertexData[1]).toBeCloseTo(0.78, 2)
    expect(runtime.device.createBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "visual-math-nextjs-webgpu-gradient-quad-vertices",
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    )
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
  })

  it("submits a quad draw and releases cached resources", () => {
    const runtime = createGradientQuadRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuGradientQuadScene(canvas, runtime, DEFAULT_WEBGPU_GRADIENT_QUAD_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledWith(
      runtime.vertexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.pass.setPipeline).toHaveBeenCalledWith(runtime.pipeline)
    expect(runtime.pass.setVertexBuffer).toHaveBeenCalledWith(0, runtime.vertexBuffer)
    expect(runtime.pass.draw).toHaveBeenCalledWith(webGpuGradientQuadVertexCount())
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuGradientQuadResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuGradientQuadResources(runtime)).toBe(false)
  })
})

function createGradientQuadRuntime() {
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

  return {
    adapter: {} as GPUAdapter,
    device,
    context,
    format: "bgra8unorm",
    pipeline,
    vertexBuffer,
    pass,
  }
}
