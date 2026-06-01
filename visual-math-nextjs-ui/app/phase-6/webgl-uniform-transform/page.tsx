import { WebGlUniformTransformPageClient } from "./page-client"

export default async function WebGlUniformTransformPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlUniformTransformPageClient serializedScene={searchParams.state ?? null} />
}
