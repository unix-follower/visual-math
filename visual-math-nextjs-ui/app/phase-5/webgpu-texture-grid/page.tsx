import { WebGpuTextureGridPageClient } from "./page-client"

export default async function WebGpuTextureGridPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuTextureGridPageClient serializedScene={searchParams.state ?? null} />
}
