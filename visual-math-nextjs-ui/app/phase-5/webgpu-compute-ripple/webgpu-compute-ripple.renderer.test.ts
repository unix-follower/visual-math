import { DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE } from "./webgpu-compute-ripple.model"
import {
  buildWebGpuComputeRippleUniformData,
  createWebGpuComputeRippleSceneResources,
  webGpuComputeRippleVertexCount,
} from "./webgpu-compute-ripple.scene"
import {
  releaseWebGpuComputeRippleResources,
  renderWebGpuComputeRippleScene,
} from "./webgpu-compute-ripple.renderer"

describe("webgpu-compute-ripple.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, STORAGE: 2, UNIFORM: 4, COPY_DST: 8 },
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
  })

  it("builds uniform data and allocates compute resources", () => {
    const runtime = createComputeRippleRuntime()

    const uniformData = buildWebGpuComputeRippleUniformData(DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)
    const resources = createWebGpuComputeRippleSceneResources(runtime)

    expect(uniformData).toHaveLength(8)
    expect(resources.vertexBuffer).toBe(runtime.vertexBuffer)
    expect(resources.uniformBuffer).toBe(runtime.uniformBuffer)
  })

  it("dispatches compute work, renders, and releases cached resources", () => {
    const runtime = createComputeRippleRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuComputeRippleScene(canvas, runtime, DEFAULT_WEBGPU_COMPUTE_RIPPLE_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledTimes(1)
    expect(runtime.computePass.setBindGroup).toHaveBeenCalledWith(0, runtime.bindGroup)
    expect(runtime.computePass.dispatchWorkgroups).toHaveBeenCalledWith(1)
    expect(runtime.renderPass.draw).toHaveBeenCalledWith(webGpuComputeRippleVertexCount())
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuComputeRippleResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.uniformBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuComputeRippleResources(runtime)).toBe(false)
  })
})

function createComputeRippleRuntime() {
  const shaderModule = {} as GPUShaderModule
  const computePipeline = {
    getBindGroupLayout: jest.fn().mockReturnValue({}),
  } as unknown as GPUComputePipeline
  const renderPipeline = {} as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const uniformBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const bindGroup = {} as GPUBindGroup
  const computePass = {
    setPipeline: jest.fn(),
    setBindGroup: jest.fn(),
    dispatchWorkgroups: jest.fn(),
    end: jest.fn(),
  } as unknown as GPUComputePassEncoder
  const renderPass = {
    setPipeline: jest.fn(),
    setVertexBuffer: jest.fn(),
    draw: jest.fn(),
    end: jest.fn(),
  } as unknown as GPURenderPassEncoder
  const commandBuffer = {} as GPUCommandBuffer
  const encoder = {
    beginComputePass: jest.fn().mockReturnValue(computePass),
    beginRenderPass: jest.fn().mockReturnValue(renderPass),
    finish: jest.fn().mockReturnValue(commandBuffer),
  } as unknown as GPUCommandEncoder
  const queue = {
    writeBuffer: jest.fn(),
    submit: jest.fn(),
  } as unknown as GPUQueue
  const device = {
    queue,
    createShaderModule: jest.fn().mockReturnValue(shaderModule),
    createComputePipeline: jest.fn().mockReturnValue(computePipeline),
    createRenderPipeline: jest.fn().mockReturnValue(renderPipeline),
    createBuffer: jest.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(uniformBuffer),
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
    bindGroup,
    vertexBuffer,
    uniformBuffer,
    computePass,
    renderPass,
  }
}
