import { UnitCirclePageClient } from "./page-client"

export default async function UnitCirclePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <UnitCirclePageClient serializedScene={searchParams.state ?? null} />
}
