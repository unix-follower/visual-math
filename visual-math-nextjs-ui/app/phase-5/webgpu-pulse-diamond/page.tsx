import { WebGpuPulseDiamondPageClient } from "./page-client"

export default async function WebGpuPulseDiamondPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuPulseDiamondPageClient serializedScene={searchParams.state ?? null} />
}
