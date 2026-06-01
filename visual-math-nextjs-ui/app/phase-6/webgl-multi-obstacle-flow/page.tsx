import { WebGlMultiObstacleFlowPageClient } from "./page-client"

export default async function WebGlMultiObstacleFlowPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlMultiObstacleFlowPageClient serializedScene={searchParams.state ?? null} />
}
