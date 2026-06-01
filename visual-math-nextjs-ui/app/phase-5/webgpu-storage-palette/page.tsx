import { WebGpuStoragePalettePageClient } from "./page-client"

export default async function WebGpuStoragePalettePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuStoragePalettePageClient serializedScene={searchParams.state ?? null} />
}
