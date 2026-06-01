import { WebGlLitMaterialPageClient } from "./page-client"

export default async function WebGlLitMaterialPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlLitMaterialPageClient serializedScene={searchParams.state ?? null} />
}
