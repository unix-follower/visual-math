import { TriangleExplorerPageClient } from "./page-client"

export default async function TriangleExplorerPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <TriangleExplorerPageClient serializedScene={searchParams.state ?? null} />
}
