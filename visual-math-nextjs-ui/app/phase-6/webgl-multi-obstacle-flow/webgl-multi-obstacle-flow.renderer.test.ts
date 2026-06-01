import { DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE } from "./webgl-multi-obstacle-flow.model"
import {
  releaseWebGlMultiObstacleFlowResources,
  renderWebGlMultiObstacleFlowScene,
} from "./webgl-multi-obstacle-flow.renderer"

describe("webgl-multi-obstacle-flow.renderer", () => {
  it("renders a two-obstacle feedback state and releases cached resources", () => {
    const runtime = createMultiObstacleRuntime()
    const canvas = document.createElement("canvas")

    renderWebGlMultiObstacleFlowScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
      0.25,
    )
    renderWebGlMultiObstacleFlowScene(
      canvas,
      runtime as never,
      DEFAULT_WEBGL_MULTI_OBSTACLE_FLOW_SCENE,
      0.5,
    )

    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.phaseLocation, 0.25)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.swirlLocation, 0.58)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.dissipationLocation, 0.62)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.mixLocation, 0.68)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.speedLocation, 1.04)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.injectionXLocation, 0.24)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.injectionYLocation, 0.62)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.injectionStrengthLocation, 0.78)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.primaryXLocation, 0.42)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.primaryYLocation, 0.5)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.primaryRadiusLocation, 0.16)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.secondaryXLocation, 0.74)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.secondaryYLocation, 0.38)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.secondaryRadiusLocation, 0.12)
    expect(runtime.context.uniform1f).toHaveBeenCalledWith(runtime.obstacleMixLocation, 0.14)
    expect(runtime.context.drawArrays).toHaveBeenCalledTimes(4)
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.frontFramebuffer,
    )
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(
      runtime.context.FRAMEBUFFER,
      runtime.backFramebuffer,
    )
    expect(runtime.context.bindFramebuffer).toHaveBeenCalledWith(runtime.context.FRAMEBUFFER, null)

    expect(releaseWebGlMultiObstacleFlowResources(runtime as never)).toBe(true)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.evolveProgram)
    expect(runtime.context.deleteProgram).toHaveBeenCalledWith(runtime.compositeProgram)
    expect(releaseWebGlMultiObstacleFlowResources(runtime as never)).toBe(false)
  })
})

function createMultiObstacleRuntime() {
  const evolveProgram = { id: "evolve-program" } as unknown as WebGLProgram
  const compositeProgram = { id: "composite-program" } as unknown as WebGLProgram
  const evolveQuadBuffer = { id: "evolve-quad-buffer" } as unknown as WebGLBuffer
  const compositeQuadBuffer = { id: "composite-quad-buffer" } as unknown as WebGLBuffer
  const frontTexture = { id: "front-texture" } as unknown as WebGLTexture
  const backTexture = { id: "back-texture" } as unknown as WebGLTexture
  const frontFramebuffer = { id: "front-framebuffer" } as unknown as WebGLFramebuffer
  const backFramebuffer = { id: "back-framebuffer" } as unknown as WebGLFramebuffer
  const shaders = Array.from({ length: 4 }, (_, index) => ({
    id: `shader-${index}`,
  })) as unknown as WebGLShader[]
  const evolveTextureLocation = { id: "evolve-u_texture" } as unknown as WebGLUniformLocation
  const phaseLocation = { id: "u_phase" } as unknown as WebGLUniformLocation
  const swirlLocation = { id: "u_swirl" } as unknown as WebGLUniformLocation
  const dissipationLocation = { id: "u_dissipation" } as unknown as WebGLUniformLocation
  const mixLocation = { id: "u_mix" } as unknown as WebGLUniformLocation
  const speedLocation = { id: "u_speed" } as unknown as WebGLUniformLocation
  const injectionXLocation = { id: "u_injectionX" } as unknown as WebGLUniformLocation
  const injectionYLocation = { id: "u_injectionY" } as unknown as WebGLUniformLocation
  const injectionStrengthLocation = { id: "u_injectionStrength" } as unknown as WebGLUniformLocation
  const primaryXLocation = { id: "u_primaryX" } as unknown as WebGLUniformLocation
  const primaryYLocation = { id: "u_primaryY" } as unknown as WebGLUniformLocation
  const primaryRadiusLocation = { id: "u_primaryRadius" } as unknown as WebGLUniformLocation
  const secondaryXLocation = { id: "u_secondaryX" } as unknown as WebGLUniformLocation
  const secondaryYLocation = { id: "u_secondaryY" } as unknown as WebGLUniformLocation
  const secondaryRadiusLocation = { id: "u_secondaryRadius" } as unknown as WebGLUniformLocation
  const compositeTextureLocation = { id: "composite-u_texture" } as unknown as WebGLUniformLocation
  const obstacleMixLocation = { id: "u_obstacleMix" } as unknown as WebGLUniformLocation
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
      return programCallCount === 1 ? evolveProgram : compositeProgram
    }),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(() => true),
    getProgramInfoLog: jest.fn(() => null),
    createBuffer: jest.fn(() => {
      bufferCallCount += 1
      return bufferCallCount === 1 ? evolveQuadBuffer : compositeQuadBuffer
    }),
    createTexture: jest.fn(() => {
      textureCallCount += 1
      return textureCallCount === 1 ? frontTexture : backTexture
    }),
    createFramebuffer: jest.fn(() => {
      framebufferCallCount += 1
      return framebufferCallCount === 1 ? frontFramebuffer : backFramebuffer
    }),
    getAttribLocation: jest.fn(() => 0),
    getUniformLocation: jest.fn((program: unknown, name: string) => {
      if (program === evolveProgram) {
        if (name === "u_texture") return evolveTextureLocation
        if (name === "u_phase") return phaseLocation
        if (name === "u_swirl") return swirlLocation
        if (name === "u_dissipation") return dissipationLocation
        if (name === "u_mix") return mixLocation
        if (name === "u_speed") return speedLocation
        if (name === "u_injectionX") return injectionXLocation
        if (name === "u_injectionY") return injectionYLocation
        if (name === "u_injectionStrength") return injectionStrengthLocation
        if (name === "u_primaryX") return primaryXLocation
        if (name === "u_primaryY") return primaryYLocation
        if (name === "u_primaryRadius") return primaryRadiusLocation
        if (name === "u_secondaryX") return secondaryXLocation
        if (name === "u_secondaryY") return secondaryYLocation
        return secondaryRadiusLocation
      }

      if (name === "u_texture") return compositeTextureLocation
      if (name === "u_mix") return mixLocation
      if (name === "u_injectionStrength") return injectionStrengthLocation
      return obstacleMixLocation
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
    evolveProgram,
    compositeProgram,
    frontFramebuffer,
    backFramebuffer,
    phaseLocation,
    swirlLocation,
    dissipationLocation,
    mixLocation,
    speedLocation,
    injectionXLocation,
    injectionYLocation,
    injectionStrengthLocation,
    primaryXLocation,
    primaryYLocation,
    primaryRadiusLocation,
    secondaryXLocation,
    secondaryYLocation,
    secondaryRadiusLocation,
    obstacleMixLocation,
  }
}
