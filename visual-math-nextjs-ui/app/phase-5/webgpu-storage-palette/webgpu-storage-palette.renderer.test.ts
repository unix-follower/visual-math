import { DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE } from "./webgpu-storage-palette.model"
import {
  buildWebGpuStoragePaletteData,
  createWebGpuStoragePaletteSceneResources,
  webGpuStoragePaletteVertexCount,
} from "./webgpu-storage-palette.scene"
import {
  releaseWebGpuStoragePaletteResources,
  renderWebGpuStoragePaletteScene,
} from "./webgpu-storage-palette.renderer"

describe("webgpu-storage-palette.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, STORAGE: 4, COPY_DST: 2 },
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

  it("builds palette data and allocates scene resources", () => {
    const runtime = createStorageRuntime()

    const paletteData = buildWebGpuStoragePaletteData(DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)
    const resources = createWebGpuStoragePaletteSceneResources(runtime)

    expect(paletteData).toHaveLength(24)
    expect(runtime.device.createBindGroup).toHaveBeenCalledTimes(1)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledWith(
      runtime.vertexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(resources.storageBuffer).toBe(runtime.storageBuffer)
  })

  it("submits a storage-buffer draw and releases cached resources", () => {
    const runtime = createStorageRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuStoragePaletteScene(canvas, runtime, DEFAULT_WEBGPU_STORAGE_PALETTE_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenLastCalledWith(
      runtime.storageBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.pass.setBindGroup).toHaveBeenCalledWith(0, runtime.bindGroup)
    expect(runtime.pass.setVertexBuffer).toHaveBeenCalledWith(0, runtime.vertexBuffer)
    expect(runtime.pass.draw).toHaveBeenCalledWith(webGpuStoragePaletteVertexCount())
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuStoragePaletteResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.storageBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuStoragePaletteResources(runtime)).toBe(false)
  })
})

function createStorageRuntime() {
  const shaderModule = {} as GPUShaderModule
  const bindGroupLayout = {} as GPUBindGroupLayout
  const bindGroup = {} as GPUBindGroup
  const pipeline = {
    getBindGroupLayout: jest.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const storageBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const pass = {
    setPipeline: jest.fn(),
    setBindGroup: jest.fn(),
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
    createBuffer: jest.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(storageBuffer),
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
    pipeline,
    bindGroup,
    vertexBuffer,
    storageBuffer,
    pass,
  }
}
