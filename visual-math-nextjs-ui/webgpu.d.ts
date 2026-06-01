type GPUTextureFormat = string

declare const GPUBufferUsage: {
  readonly VERTEX: number
  readonly INDEX: number
  readonly UNIFORM: number
  readonly STORAGE: number
  readonly INDIRECT: number
  readonly COPY_DST: number
}

declare const GPUTextureUsage: {
  readonly TEXTURE_BINDING: number
  readonly COPY_DST: number
  readonly RENDER_ATTACHMENT: number
  readonly STORAGE_BINDING: number
}

interface NavigatorGPU {
  requestAdapter(): Promise<GPUAdapter | null>
  getPreferredCanvasFormat(): GPUTextureFormat
}

interface Navigator {
  gpu?: NavigatorGPU
}

interface GPUAdapter {
  requestDevice(descriptor?: { readonly label?: string }): Promise<GPUDevice>
}

interface GPUDevice {
  readonly queue: GPUQueue
  createShaderModule(descriptor: {
    readonly label?: string
    readonly code: string
  }): GPUShaderModule
  createRenderPipeline(descriptor: {
    readonly label?: string
    readonly layout?: string
    readonly vertex: {
      readonly module: GPUShaderModule
      readonly entryPoint: string
      readonly buffers: readonly {
        readonly arrayStride: number
        readonly stepMode?: string
        readonly attributes: readonly {
          readonly shaderLocation: number
          readonly offset: number
          readonly format: string
        }[]
      }[]
    }
    readonly fragment: {
      readonly module: GPUShaderModule
      readonly entryPoint: string
      readonly targets: readonly { readonly format: GPUTextureFormat }[]
    }
    readonly primitive?: {
      readonly topology?: string
    }
  }): GPURenderPipeline
  createComputePipeline(descriptor: {
    readonly label?: string
    readonly layout?: string
    readonly compute: {
      readonly module: GPUShaderModule
      readonly entryPoint: string
    }
  }): GPUComputePipeline
  createBuffer(descriptor: {
    readonly label?: string
    readonly size: number
    readonly usage: number
  }): GPUBuffer
  createTexture(descriptor: {
    readonly label?: string
    readonly size:
      | readonly [number, number]
      | {
          readonly width: number
          readonly height: number
          readonly depthOrArrayLayers?: number
        }
    readonly format: GPUTextureFormat
    readonly usage: number
  }): GPUTexture
  createSampler(descriptor?: {
    readonly label?: string
    readonly magFilter?: string
    readonly minFilter?: string
    readonly mipmapFilter?: string
  }): GPUSampler
  createBindGroup(descriptor: {
    readonly label?: string
    readonly layout: GPUBindGroupLayout
    readonly entries: readonly {
      readonly binding: number
      readonly resource:
        | {
            readonly buffer: GPUBuffer
          }
        | GPUTextureView
        | GPUSampler
    }[]
  }): GPUBindGroup
  createCommandEncoder(descriptor?: { readonly label?: string }): GPUCommandEncoder
}

interface GPUQueue {
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource): void
  writeTexture(
    destination: { readonly texture: GPUTexture },
    data: BufferSource,
    dataLayout: {
      readonly bytesPerRow: number
      readonly rowsPerImage?: number
    },
    size:
      | readonly [number, number]
      | {
          readonly width: number
          readonly height: number
          readonly depthOrArrayLayers?: number
        },
  ): void
  copyExternalImageToTexture(
    source: { readonly source: CanvasImageSource },
    destination: { readonly texture: GPUTexture },
    copySize: readonly [number, number],
  ): void
  submit(commandBuffers: readonly GPUCommandBuffer[]): void
}

interface GPUShaderModule {}

interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout
}

interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout
}

interface GPUBindGroupLayout {}

interface GPUBindGroup {}

interface GPUBuffer {
  destroy?(): void
}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: {
    readonly colorAttachments: readonly {
      readonly view: GPUTextureView
      readonly clearValue: {
        readonly r: number
        readonly g: number
        readonly b: number
        readonly a: number
      }
      readonly loadOp: string
      readonly storeOp: string
    }[]
  }): GPURenderPassEncoder
  beginComputePass(descriptor?: { readonly label?: string }): GPUComputePassEncoder
  finish(descriptor?: { readonly label?: string }): GPUCommandBuffer
}

interface GPUCommandBuffer {}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void
  setBindGroup(index: number, bindGroup: GPUBindGroup): void
  setVertexBuffer(slot: number, buffer: GPUBuffer): void
  setIndexBuffer(buffer: GPUBuffer, indexFormat: string): void
  draw(
    vertexCount: number,
    instanceCount?: number,
    firstVertex?: number,
    firstInstance?: number,
  ): void
  drawIndexed(
    indexCount: number,
    instanceCount?: number,
    firstIndex?: number,
    baseVertex?: number,
    firstInstance?: number,
  ): void
  drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void
  drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void
  end(): void
}

interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void
  setBindGroup(index: number, bindGroup: GPUBindGroup): void
  dispatchWorkgroups(x: number, y?: number, z?: number): void
  end(): void
}

interface GPUCanvasContext {
  configure(configuration: {
    readonly device: GPUDevice
    readonly format: GPUTextureFormat
    readonly alphaMode?: string
  }): void
  getCurrentTexture(): GPUTexture
}

interface GPUTexture {
  createView(): GPUTextureView
  destroy?(): void
}

interface GPUTextureView {}

interface GPUSampler {}

interface HTMLCanvasElement {
  getContext(contextId: "webgpu"): GPUCanvasContext | null
}
