import { GraphTraversalLabPageClient } from "./page-client"

export default async function GraphTraversalLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <GraphTraversalLabPageClient serializedScene={searchParams.state ?? null} />
}
