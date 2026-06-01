import { WebGpuGradientQuadPageClient } from "./page-client"

export default async function WebGpuGradientQuadPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuGradientQuadPageClient serializedScene={searchParams.state ?? null} />
}
