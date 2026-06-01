import { DEFAULT_WEBGPU_TEXTURE_GRID_SCENE } from "./webgpu-texture-grid.model"
import {
  buildWebGpuTextureGridData,
  createWebGpuTextureGridSceneResources,
  webGpuTextureGridSize,
} from "./webgpu-texture-grid.scene"
import {
  releaseWebGpuTextureGridResources,
  renderWebGpuTextureGridScene,
} from "./webgpu-texture-grid.renderer"

describe("webgpu-texture-grid.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage
  const originalTextureUsage = globalThis.GPUTextureUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, COPY_DST: 2 },
    })
    Object.defineProperty(globalThis, "GPUTextureUsage", {
      configurable: true,
      value: { TEXTURE_BINDING: 1, COPY_DST: 2 },
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

  it("builds texture data and allocates resources", () => {
    const runtime = createTextureGridRuntime()

    const textureData = buildWebGpuTextureGridData(DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)
    const resources = createWebGpuTextureGridSceneResources(runtime)

    expect(textureData).toHaveLength(webGpuTextureGridSize() * webGpuTextureGridSize() * 4)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(resources.texture).toBe(runtime.texture)
  })

  it("uploads texture data, draws, and releases cached resources", () => {
    const runtime = createTextureGridRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuTextureGridScene(canvas, runtime, DEFAULT_WEBGPU_TEXTURE_GRID_SCENE)

    expect(runtime.device.queue.writeTexture).toHaveBeenCalledTimes(1)
    expect(runtime.pass.setBindGroup).toHaveBeenCalledWith(0, runtime.bindGroup)
    expect(runtime.pass.draw).toHaveBeenCalledWith(6)
    expect(releaseWebGpuTextureGridResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.texture.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuTextureGridResources(runtime)).toBe(false)
  })
})

function createTextureGridRuntime() {
  const shaderModule = {} as GPUShaderModule
  const pipeline = {
    getBindGroupLayout: jest.fn().mockReturnValue({}),
  } as unknown as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const textureView = {} as GPUTextureView
  const texture = {
    createView: jest.fn().mockReturnValue(textureView),
    destroy: jest.fn(),
  } as unknown as GPUTexture
  const bindGroup = {} as GPUBindGroup
  const pass = {
    setPipeline: jest.fn(),
    setBindGroup: jest.fn(),
    setVertexBuffer: jest.fn(),
    draw: jest.fn(),
    end: jest.fn(),
  } as unknown as GPURenderPassEncoder
  const commandBuffer = {} as GPUCommandBuffer
  const encoder = {
    beginRenderPass: jest.fn().mockReturnValue(pass),
    finish: jest.fn().mockReturnValue(commandBuffer),
  } as unknown as GPUCommandEncoder
  const queue = {
    writeBuffer: jest.fn(),
    writeTexture: jest.fn(),
    submit: jest.fn(),
  } as unknown as GPUQueue
  const device = {
    queue,
    createShaderModule: jest.fn().mockReturnValue(shaderModule),
    createRenderPipeline: jest.fn().mockReturnValue(pipeline),
    createBuffer: jest.fn().mockReturnValue(vertexBuffer),
    createTexture: jest.fn().mockReturnValue(texture),
    createBindGroup: jest.fn().mockReturnValue(bindGroup),
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
    texture,
    bindGroup,
    vertexBuffer,
    pass,
  }
}
