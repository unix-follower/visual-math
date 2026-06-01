import { WebGlGradientTrianglePageClient } from "./page-client"

export default async function WebGlGradientTrianglePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlGradientTrianglePageClient serializedScene={searchParams.state ?? null} />
}
