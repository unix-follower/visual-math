import { DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE } from "./webgpu-instanced-lattice.model"
import {
  buildWebGpuInstancedLatticeInstanceData,
  createWebGpuInstancedLatticeSceneResources,
  webGpuInstancedLatticeInstanceCount,
  webGpuInstancedLatticeMeshVertexCount,
} from "./webgpu-instanced-lattice.scene"
import {
  releaseWebGpuInstancedLatticeResources,
  renderWebGpuInstancedLatticeScene,
} from "./webgpu-instanced-lattice.renderer"

describe("webgpu-instanced-lattice.renderer", () => {
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

  it("builds instance data and allocates scene resources", () => {
    const runtime = createInstancedRuntime()

    const instanceData = buildWebGpuInstancedLatticeInstanceData(
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )
    const resources = createWebGpuInstancedLatticeSceneResources(
      runtime,
      DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE,
    )

    expect(instanceData).toHaveLength(webGpuInstancedLatticeInstanceCount() * 8)
    expect(runtime.device.createBuffer).toHaveBeenCalledTimes(2)
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(2)
    expect(resources.instanceBuffer).toBe(runtime.instanceBuffer)
  })

  it("submits an instanced draw and releases cached resources", () => {
    const runtime = createInstancedRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuInstancedLatticeScene(canvas, runtime, DEFAULT_WEBGPU_INSTANCED_LATTICE_SCENE)

    expect(runtime.pass.setVertexBuffer).toHaveBeenNthCalledWith(1, 0, runtime.meshBuffer)
    expect(runtime.pass.setVertexBuffer).toHaveBeenNthCalledWith(2, 1, runtime.instanceBuffer)
    expect(runtime.pass.draw).toHaveBeenCalledWith(
      webGpuInstancedLatticeMeshVertexCount(),
      webGpuInstancedLatticeInstanceCount(),
    )
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuInstancedLatticeResources(runtime)).toBe(true)
    expect(runtime.meshBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.instanceBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuInstancedLatticeResources(runtime)).toBe(false)
  })
})

function createInstancedRuntime() {
  const shaderModule = {} as GPUShaderModule
  const pipeline = {} as GPURenderPipeline
  const meshBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const instanceBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
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
    createBuffer: jest.fn().mockReturnValueOnce(meshBuffer).mockReturnValueOnce(instanceBuffer),
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
    meshBuffer,
    instanceBuffer,
    pass,
  }
}
