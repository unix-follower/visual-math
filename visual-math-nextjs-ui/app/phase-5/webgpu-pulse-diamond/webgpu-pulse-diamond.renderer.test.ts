import { DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE } from "./webgpu-pulse-diamond.model"
import {
  buildWebGpuPulseDiamondVertexData,
  createWebGpuPulseDiamondSceneResources,
  webGpuPulseDiamondVertexCount,
} from "./webgpu-pulse-diamond.scene"
import {
  releaseWebGpuPulseDiamondResources,
  renderWebGpuPulseDiamondScene,
} from "./webgpu-pulse-diamond.renderer"

describe("webgpu-pulse-diamond.renderer", () => {
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

  it("builds animated vertex data and allocates scene resources", () => {
    const runtime = createPulseDiamondRuntime()

    const vertexData = buildWebGpuPulseDiamondVertexData(DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, 0.25)
    const resources = createWebGpuPulseDiamondSceneResources(runtime)

    expect(vertexData).toHaveLength(webGpuPulseDiamondVertexCount() * 6)
    expect(vertexData[0]).toBeCloseTo(0.031, 3)
    expect(vertexData[1]).toBeCloseTo(0.72, 2)
    expect(runtime.device.createBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "visual-math-nextjs-webgpu-pulse-diamond-vertices",
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    )
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
  })

  it("submits an animated draw and releases cached resources", () => {
    const runtime = createPulseDiamondRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuPulseDiamondScene(canvas, runtime, DEFAULT_WEBGPU_PULSE_DIAMOND_SCENE, 0.25)

    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledWith(
      runtime.vertexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.pass.setPipeline).toHaveBeenCalledWith(runtime.pipeline)
    expect(runtime.pass.setVertexBuffer).toHaveBeenCalledWith(0, runtime.vertexBuffer)
    expect(runtime.pass.draw).toHaveBeenCalledWith(webGpuPulseDiamondVertexCount())
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuPulseDiamondResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuPulseDiamondResources(runtime)).toBe(false)
  })
})

function createPulseDiamondRuntime() {
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
