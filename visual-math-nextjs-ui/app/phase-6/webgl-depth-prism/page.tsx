import { WebGlDepthPrismPageClient } from "./page-client"

export default async function WebGlDepthPrismPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlDepthPrismPageClient serializedScene={searchParams.state ?? null} />
}
