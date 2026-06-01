import { DEFAULT_WEBGPU_DUAL_PASS_SCENE } from "./webgpu-dual-pass.model"
import {
  buildWebGpuDualPassGeometryData,
  createWebGpuDualPassSceneResources,
  webGpuDualPassGeometryVertexCount,
  webGpuDualPassOffscreenSize,
} from "./webgpu-dual-pass.scene"
import {
  releaseWebGpuDualPassResources,
  renderWebGpuDualPassScene,
} from "./webgpu-dual-pass.renderer"

describe("webgpu-dual-pass.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage
  const originalTextureUsage = globalThis.GPUTextureUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, COPY_DST: 2 },
    })
    Object.defineProperty(globalThis, "GPUTextureUsage", {
      configurable: true,
      value: { TEXTURE_BINDING: 4, RENDER_ATTACHMENT: 8 },
    })
  })

  afterAll(() => {
    if (originalBufferUsage === undefined) {
      Reflect.deleteProperty(globalThis, "GPUBufferUsage")
    } else {
      Object.defineProperty(globalThis, "GPUBufferUsage", {
        configurable: true,
        value: originalBufferUsage,
      })
    }

    if (originalTextureUsage === undefined) {
      Reflect.deleteProperty(globalThis, "GPUTextureUsage")
    } else {
      Object.defineProperty(globalThis, "GPUTextureUsage", {
        configurable: true,
        value: originalTextureUsage,
      })
    }
  })

  it("builds geometry data and allocates dual-pass resources", () => {
    const runtime = createDualPassRuntime()

    const geometry = buildWebGpuDualPassGeometryData(DEFAULT_WEBGPU_DUAL_PASS_SCENE)
    const resources = createWebGpuDualPassSceneResources(runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(geometry.length).toBe(webGpuDualPassGeometryVertexCount() * 6)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(resources.intermediateTexture).toBe(runtime.intermediateTexture)
    expect(webGpuDualPassOffscreenSize()).toBe(256)
  })

  it("renders both passes and releases cached resources", () => {
    const runtime = createDualPassRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuDualPassScene(canvas, runtime, DEFAULT_WEBGPU_DUAL_PASS_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(3)
    expect(runtime.firstPass.draw).toHaveBeenCalledWith(6)
    expect(runtime.secondPass.setBindGroup).toHaveBeenCalledWith(0, runtime.bindGroup)
    expect(runtime.secondPass.draw).toHaveBeenCalledWith(6)
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuDualPassResources(runtime)).toBe(true)
    expect(runtime.geometryBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.quadBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.intermediateTexture.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuDualPassResources(runtime)).toBe(false)
  })
})

function createDualPassRuntime() {
  const shaderModule = {} as GPUShaderModule
  const firstPipeline = {} as GPURenderPipeline
  const secondPipeline = {
    getBindGroupLayout: jest.fn().mockReturnValue({}),
  } as unknown as GPURenderPipeline
  const geometryBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const quadBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const intermediateTexture = {
    createView: jest.fn().mockReturnValue({}),
    destroy: jest.fn(),
  } as unknown as GPUTexture
  const bindGroup = {} as GPUBindGroup
  const firstPass = {
    setPipeline: jest.fn(),
    setVertexBuffer: jest.fn(),
    draw: jest.fn(),
    end: jest.fn(),
  } as unknown as GPURenderPassEncoder
  const secondPass = {
    setPipeline: jest.fn(),
    setBindGroup: jest.fn(),
    setVertexBuffer: jest.fn(),
    draw: jest.fn(),
    end: jest.fn(),
  } as unknown as GPURenderPassEncoder
  const commandBuffer = {} as GPUCommandBuffer
  const encoder = {
    beginRenderPass: jest.fn().mockReturnValueOnce(firstPass).mockReturnValueOnce(secondPass),
    finish: jest.fn().mockReturnValue(commandBuffer),
  } as unknown as GPUCommandEncoder
  const queue = {
    writeBuffer: jest.fn(),
    submit: jest.fn(),
  } as unknown as GPUQueue
  const device = {
    queue,
    createShaderModule: jest.fn().mockReturnValue(shaderModule),
    createRenderPipeline: jest
      .fn()
      .mockReturnValueOnce(firstPipeline)
      .mockReturnValueOnce(secondPipeline),
    createBuffer: jest.fn().mockReturnValueOnce(geometryBuffer).mockReturnValueOnce(quadBuffer),
    createTexture: jest.fn().mockReturnValue(intermediateTexture),
    createBindGroup: jest.fn().mockReturnValue(bindGroup),
    createCommandEncoder: jest.fn().mockReturnValue(encoder),
  } as unknown as GPUDevice
  const context = {
    getCurrentTexture: jest.fn().mockReturnValue({ createView: jest.fn().mockReturnValue({}) }),
  } as unknown as GPUCanvasContext

  return {
    adapter: {} as GPUAdapter,
    device,
    context,
    format: "bgra8unorm",
    geometryBuffer,
    quadBuffer,
    intermediateTexture,
    bindGroup,
    firstPass,
    secondPass,
  }
}
