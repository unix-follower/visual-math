import { WebGlTextureGridPageClient } from "./page-client"

export default async function WebGlTextureGridPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlTextureGridPageClient serializedScene={searchParams.state ?? null} />
}
