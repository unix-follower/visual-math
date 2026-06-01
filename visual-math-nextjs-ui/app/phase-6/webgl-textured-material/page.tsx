import { WebGlTexturedMaterialPageClient } from "./page-client"

export default async function WebGlTexturedMaterialPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlTexturedMaterialPageClient serializedScene={searchParams.state ?? null} />
}
