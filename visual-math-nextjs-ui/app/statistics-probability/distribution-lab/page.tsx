import { DistributionLabPageClient } from "./page-client"

export default async function DistributionLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <DistributionLabPageClient serializedScene={searchParams.state ?? null} />
}
