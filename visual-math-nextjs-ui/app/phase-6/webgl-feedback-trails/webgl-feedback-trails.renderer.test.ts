import { DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE } from "./webgl-feedback-trails.model"
import {
  releaseWebGlFeedbackTrailsResources,
  renderWebGlFeedbackTrailsScene,
} from "./webgl-feedback-trails.renderer"

describe("webgl-feedback-trails.renderer", () => {
  it("renders the seeded trail relays and releases resources", () => {
    const runtime = createFeedbackTrailsRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlFeedbackTrailsScene(canvas, runtime as never, DEFAULT_WEBGL_FEEDBACK_TRAILS_SCENE)

    const uniformCalls = runtime.context.uniform1f.mock.calls as Array<[unknown, number]>
    const driftCalls = uniformCalls
      .filter(([location]) => location === runtime.driftLocation)
      .map(([, value]) => value)
    const decayCalls = uniformCalls
      .filter(([location]) => location === runtime.decayLocation)
      .map(([, value]) => value)
    const mixCalls = uniformCalls
      .filter(([location]) => location === runtime.mixLocation)
      .map(([, value]) => value)

    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.firstFramebuffer,
    )
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.secondFramebuffer,
    )
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(runtime.context.FRAMEBUFFER, null)
    expect(uniformCalls).toContainEqual([runtime.glowLocation, 0.76])
    expect(driftCalls).toHaveLength(8)
    expect(driftCalls[0]).toBeCloseTo(0.408)
    expect(driftCalls[7]).toBeCloseTo(0.153)
    expect(decayCalls).toHaveLength(8)
    expect(decayCalls[0]).toBeCloseTo(0.58)
    expect(decayCalls[7]).toBeCloseTo(0.3)
    expect(mixCalls).toEqual([0.68])
    expect(runtime.context.drawArrays).toHaveBeenCalledTimes(10)

    expect(releaseWebGlFeedbackTrailsResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.geometryBuffer)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.trailQuadBuffer)
    expect(runtime.context.deleteBuffer).toHaveBeenCalledWith(runtime.compositeQuadBuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.firstFramebuffer)
    expect(runtime.context.deleteFramebuffer).toHaveBeenCalledWith(runtime.secondFramebuffer)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.firstTexture)
    expect(runtime.context.deleteTexture).toHaveBeenCalledWith(runtime.secondTexture)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.seedProgram)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.trailProgram)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.compositeProgram)
    expect(releaseWebGlFeedbackTrailsResources(runtime as never)).toBe(false)
  })
})

function createFeedbackTrailsRuntime() {
  const seedProgram = { id: "seed-program" } as unknown as WebGLProgram
  const trailProgram = { id: "trail-program" } as unknown as WebGLProgram
  const compositeProgram = { id: "composite-program" } as unknown as WebGLProgram
  const geometryBuffer = { id: "geometry-buffer" } as unknown as WebGLBuffer
  const trailQuadBuffer = { id: "trail-quad-buffer" } as unknown as WebGLBuffer
  const compositeQuadBuffer = { id: "composite-quad-buffer" } as unknown as WebGLBuffer
  const firstTexture = { id: "first-texture" } as unknown as WebGLTexture
  const secondTexture = { id: "second-texture" } as unknown as WebGLTexture
  const firstFramebuffer = { id: "first-framebuffer" } as unknown as WebGLFramebuffer
  const secondFramebuffer = { id: "second-framebuffer" } as unknown as WebGLFramebuffer
  const shaders = Array.from({ length: 6 }, (_, index) => ({
    id: `shader-${index}`,
  })) as unknown as WebGLShader[]
  const glowLocation = { id: "u_glow" } as unknown as WebGLUniformLocation
  const trailTextureLocation = { id: "trail-u_texture" } as unknown as WebGLUniformLocation
  const driftLocation = { id: "u_drift" } as unknown as WebGLUniformLocation
  const decayLocation = { id: "u_decay" } as unknown as WebGLUniformLocation
  const compositeTextureLocation = { id: "composite-u_texture" } as unknown as WebGLUniformLocation
  const mixLocation = { id: "u_mix" } as unknown as WebGLUniformLocation
  let shaderCallCount = 0
  let programCallCount = 0
  let bufferCallCount = 0
  let textureCallCount = 0
  let framebufferCallCount = 0

  const context = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    COLOR_BUFFER_BIT: 16384,
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    TEXTURE0: 33984,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    CLAMP_TO_EDGE: 33071,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MAG_FILTER: 10240,
    LINEAR: 9729,
    createShader: jest.fn(() => shaders[shaderCallCount++]),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    getShaderParameter: jest.fn(() => true),
    getShaderInfoLog: jest.fn(() => null),
    deleteShader: jest.fn(),
    createProgram: jest.fn(() => {
      programCallCount += 1
      if (programCallCount === 1) return seedProgram
      if (programCallCount === 2) return trailProgram
      return compositeProgram
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => null),
    createBuffer: jest.fn(() => {
      bufferCallCount += 1
      if (bufferCallCount === 1) return geometryBuffer
      if (bufferCallCount === 2) return trailQuadBuffer
      return compositeQuadBuffer
    }),
    createTexture: jest.fn(() => {
      textureCallCount += 1
      return textureCallCount === 1 ? firstTexture : secondTexture
    }),
    createFramebuffer: jest.fn(() => {
      framebufferCallCount += 1
      return framebufferCallCount === 1 ? firstFramebuffer : secondFramebuffer
    }),
    getAttribLocation: jest.fn((program: unknown, name: string) => {
      if (program === seedProgram) return name === "a_position" ? 0 : 1
      return name === "a_position" ? 0 : 1
    }),
    getUniformLocation: jest.fn((program: unknown, name: string) => {
      if (program === seedProgram) return glowLocation
      if (program === trailProgram) {
        if (name === "u_texture") return trailTextureLocation
        if (name === "u_drift") return driftLocation
        return decayLocation
      }
      if (name === "u_texture") return compositeTextureLocation
      return mixLocation
    }),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    bindTexture: jest.fn(),
    texParameteri: jest.fn(),
    texImage2D: jest.fn(),
    bindFramebuffer: jest.fn(),
    framebufferTexture2D: jest.fn(),
    viewport: jest.fn(),
    clearColor: jest.fn(),
    clear: jest.fn(),
    useProgram: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    activeTexture: jest.fn(),
    uniform1i: jest.fn(),
    uniform1f: jest.fn(),
    drawArrays: jest.fn(),
    deleteBuffer: jest.fn(),
    deleteTexture: jest.fn(),
    deleteFramebuffer: jest.fn(),
    deleteProgram: jest.fn(),
  } as unknown as WebGL2RenderingContext

  return {
    context,
    version: "webgl2" as const,
    seedProgram,
    trailProgram,
    compositeProgram,
    geometryBuffer,
    trailQuadBuffer,
    compositeQuadBuffer,
    firstTexture,
    secondTexture,
    firstFramebuffer,
    secondFramebuffer,
    glowLocation,
    driftLocation,
    decayLocation,
    mixLocation,
  }
}
