import { WebGpuDualPassPageClient } from "./page-client"

export default async function WebGpuDualPassPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuDualPassPageClient serializedScene={searchParams.state ?? null} />
}
