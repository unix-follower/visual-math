import { WebGpuInstancedLatticePageClient } from "./page-client"

export default async function WebGpuInstancedLatticePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuInstancedLatticePageClient serializedScene={searchParams.state ?? null} />
}
