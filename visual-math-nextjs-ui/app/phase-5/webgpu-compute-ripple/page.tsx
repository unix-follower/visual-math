import { WebGpuComputeRipplePageClient } from "./page-client"

export default async function WebGpuComputeRipplePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuComputeRipplePageClient serializedScene={searchParams.state ?? null} />
}
