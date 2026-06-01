import { WebGlIndexedPolygonPageClient } from "./page-client"

export default async function WebGlIndexedPolygonPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlIndexedPolygonPageClient serializedScene={searchParams.state ?? null} />
}
