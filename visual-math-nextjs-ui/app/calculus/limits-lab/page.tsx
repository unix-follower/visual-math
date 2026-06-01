import { LimitsLabPageClient } from "./page-client"

export default async function LimitsLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <LimitsLabPageClient serializedScene={searchParams.state ?? null} />
}
