import { WebGpuIndexedPolygonPageClient } from "./page-client"

export default async function WebGpuIndexedPolygonPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuIndexedPolygonPageClient serializedScene={searchParams.state ?? null} />
}
