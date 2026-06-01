import { WebGpuIndirectIndexedPolygonPageClient } from "./page-client"

export default async function WebGpuIndirectIndexedPolygonPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuIndirectIndexedPolygonPageClient serializedScene={searchParams.state ?? null} />
}
