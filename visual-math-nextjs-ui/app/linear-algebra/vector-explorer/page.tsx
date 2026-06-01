import { VectorExplorerPageClient } from "./page-client"

export default async function VectorExplorerPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <VectorExplorerPageClient serializedScene={searchParams.state ?? null} />
}
