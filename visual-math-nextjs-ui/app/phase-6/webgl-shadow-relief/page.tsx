import { WebGlShadowReliefPageClient } from "./page-client"

export default async function WebGlShadowReliefPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlShadowReliefPageClient serializedScene={searchParams.state ?? null} />
}
