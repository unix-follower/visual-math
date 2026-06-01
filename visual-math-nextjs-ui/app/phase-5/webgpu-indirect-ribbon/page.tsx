import { WebGpuIndirectRibbonPageClient } from "./page-client"

export default async function WebGpuIndirectRibbonPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuIndirectRibbonPageClient serializedScene={searchParams.state ?? null} />
}
