import { WebGpuSamplerWavePageClient } from "./page-client"

export default async function WebGpuSamplerWavePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuSamplerWavePageClient serializedScene={searchParams.state ?? null} />
}
