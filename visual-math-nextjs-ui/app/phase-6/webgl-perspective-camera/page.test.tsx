import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WebGlPerspectiveCameraPageClient } from "./page-client"

describe("WebGlPerspectiveCameraPageClient", () => {
  it("renders the route and falls back under jsdom", async () => {
    render(<WebGlPerspectiveCameraPageClient serializedScene={null} />)

    expect(screen.getByRole("heading", { name: "WebGL Perspective Camera" })).toBeInTheDocument()

    await screen.findByText(/WebGL2 is unavailable in this environment/)
  })

  it("applies presets and updates camera metrics without a WebGL runtime", async () => {
    render(<WebGlPerspectiveCameraPageClient serializedScene={null} />)

    await screen.findByText(/WebGL2 is unavailable in this environment/)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Stage sweep Wider lens and stronger yaw to exaggerate the layered z-range.",
      }),
    )

    await waitFor(() => {
      expect(screen.getByText("yaw 38°, pitch 24°")).toBeInTheDocument()
      expect(screen.getByText("72° fov at 4.6 units")).toBeInTheDocument()
      expect(screen.getByText("z-span 1.81")).toBeInTheDocument()
    })
  })
})
