import { getWebGpuContext, hasWebGpuSupport, initializeWebGpuCanvas } from "./webgpu-bootstrap"

describe("webgpu-bootstrap", () => {
  const originalGpu = navigator.gpu

  afterEach(() => {
    if (originalGpu === undefined) {
      delete navigator.gpu
    } else {
      Object.defineProperty(navigator, "gpu", {
        configurable: true,
        value: originalGpu,
      })
    }

    jest.restoreAllMocks()
  })

  it("detects WebGPU support from navigator.gpu", () => {
    delete navigator.gpu
    expect(hasWebGpuSupport()).toBe(false)

    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: {},
    })

    expect(hasWebGpuSupport()).toBe(true)
  })

  it("returns null when the canvas throws while requesting a WebGPU context", () => {
    const canvas = document.createElement("canvas")
    jest.spyOn(canvas, "getContext").mockImplementation(() => {
      throw new Error("unsupported")
    })

    expect(getWebGpuContext(canvas)).toBeNull()
  })

  it("reports missing WebGPU support", async () => {
    delete navigator.gpu

    await expect(initializeWebGpuCanvas(document.createElement("canvas"))).resolves.toEqual({
      ok: false,
      reason: "WebGPU is unavailable in this browser or test environment.",
    })
  })

  it("reports when the browser does not provide a WebGPU context", async () => {
    const canvas = document.createElement("canvas")
    jest.spyOn(canvas, "getContext").mockReturnValue(null)
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: {
        requestAdapter: jest.fn(),
        getPreferredCanvasFormat: jest.fn(),
      },
    })

    await expect(initializeWebGpuCanvas(canvas)).resolves.toEqual({
      ok: false,
      reason: "The browser did not provide a WebGPU canvas context.",
    })
  })

  it("reports when no WebGPU adapter is available", async () => {
    const canvas = document.createElement("canvas")
    const context = { configure: jest.fn() }
    jest.spyOn(canvas, "getContext").mockReturnValue(context)
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: {
        requestAdapter: jest.fn().mockResolvedValue(null),
        getPreferredCanvasFormat: jest.fn(),
      },
    })

    await expect(initializeWebGpuCanvas(canvas)).resolves.toEqual({
      ok: false,
      reason: "No compatible WebGPU adapter was found for this device.",
    })
  })

  it("reports when the browser omits the preferred canvas format", async () => {
    const canvas = document.createElement("canvas")
    const context = { configure: jest.fn() }
    const device = {}
    const adapter = {
      requestDevice: jest.fn().mockResolvedValue(device),
    }

    jest.spyOn(canvas, "getContext").mockReturnValue(context)
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: {
        requestAdapter: jest.fn().mockResolvedValue(adapter),
        getPreferredCanvasFormat: jest.fn().mockReturnValue(undefined),
      },
    })

    await expect(initializeWebGpuCanvas(canvas)).resolves.toEqual({
      ok: false,
      reason: "The browser did not report a preferred WebGPU canvas format.",
    })
  })

  it("configures the WebGPU canvas when adapter, device, and format exist", async () => {
    const canvas = document.createElement("canvas")
    const context = { configure: jest.fn() }
    const device = { label: "device" }
    const adapter = {
      requestDevice: jest.fn().mockResolvedValue(device),
    }

    jest.spyOn(canvas, "getContext").mockReturnValue(context)
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: {
        requestAdapter: jest.fn().mockResolvedValue(adapter),
        getPreferredCanvasFormat: jest.fn().mockReturnValue("bgra8unorm"),
      },
    })

    await expect(initializeWebGpuCanvas(canvas)).resolves.toEqual({
      ok: true,
      runtime: {
        adapter,
        device,
        context,
        format: "bgra8unorm",
      },
    })
    expect(context.configure).toHaveBeenCalledWith({
      device,
      format: "bgra8unorm",
      alphaMode: "premultiplied",
    })
  })
})
