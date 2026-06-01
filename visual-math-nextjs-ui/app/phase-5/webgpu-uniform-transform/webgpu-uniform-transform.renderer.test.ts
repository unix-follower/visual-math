import { DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE } from "./webgpu-uniform-transform.model"
import {
  buildWebGpuUniformTransformUniformData,
  createWebGpuUniformTransformSceneResources,
  webGpuUniformTransformVertexCount,
} from "./webgpu-uniform-transform.scene"
import {
  releaseWebGpuUniformTransformResources,
  renderWebGpuUniformTransformScene,
} from "./webgpu-uniform-transform.renderer"

describe("webgpu-uniform-transform.renderer", () => {
  const originalBufferUsage = globalThis.GPUBufferUsage

  beforeAll(() => {
    Object.defineProperty(globalThis, "GPUBufferUsage", {
      configurable: true,
      value: { VERTEX: 1, UNIFORM: 4, COPY_DST: 2 },
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

  it("builds uniform data and allocates bind-group resources", () => {
    const runtime = createUniformRuntime()

    const uniformData = buildWebGpuUniformTransformUniformData(
      DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE,
    )
    const resources = createWebGpuUniformTransformSceneResources(runtime)

    expect(uniformData).toHaveLength(8)
    expect(uniformData[0]).toBeCloseTo(0.78, 2)
    expect(uniformData[1]).toBeCloseTo(Math.PI / 10, 3)
    expect(runtime.device.createBindGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "visual-math-nextjs-webgpu-uniform-transform-bind-group",
      }),
    )
    expect(runtime.device.queue.writeBuffer).toHaveBeenCalledWith(
      runtime.vertexBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(resources.uniformBuffer).toBe(runtime.uniformBuffer)
  })

  it("submits a uniform-buffer draw and releases cached resources", () => {
    const runtime = createUniformRuntime()
    const canvas = document.createElement("canvas")

    renderWebGpuUniformTransformScene(canvas, runtime, DEFAULT_WEBGPU_UNIFORM_TRANSFORM_SCENE)

    expect(runtime.device.queue.writeBuffer).toHaveBeenLastCalledWith(
      runtime.uniformBuffer,
      0,
      expect.any(ArrayBuffer),
    )
    expect(runtime.pass.setPipeline).toHaveBeenCalledWith(runtime.pipeline)
    expect(runtime.pass.setBindGroup).toHaveBeenCalledWith(0, runtime.bindGroup)
    expect(runtime.pass.setVertexBuffer).toHaveBeenCalledWith(0, runtime.vertexBuffer)
    expect(runtime.pass.draw).toHaveBeenCalledWith(webGpuUniformTransformVertexCount())
    expect(runtime.device.queue.submit).toHaveBeenCalledTimes(1)

    expect(releaseWebGpuUniformTransformResources(runtime)).toBe(true)
    expect(runtime.vertexBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(runtime.uniformBuffer.destroy).toHaveBeenCalledTimes(1)
    expect(releaseWebGpuUniformTransformResources(runtime)).toBe(false)
  })
})

function createUniformRuntime() {
  const shaderModule = {} as GPUShaderModule
  const bindGroupLayout = {} as GPUBindGroupLayout
  const bindGroup = {} as GPUBindGroup
  const pipeline = {
    getBindGroupLayout: jest.fn().mockReturnValue(bindGroupLayout),
  } as unknown as GPURenderPipeline
  const vertexBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
  const uniformBuffer = { destroy: jest.fn() } as unknown as GPUBuffer
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
    createBuffer: jest.fn().mockReturnValueOnce(vertexBuffer).mockReturnValueOnce(uniformBuffer),
    createBindGroup: jest.fn().mockReturnValue(bindGroup),
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
    bindGroup,
    vertexBuffer,
    uniformBuffer,
    pass,
  }

  return runtime
}
