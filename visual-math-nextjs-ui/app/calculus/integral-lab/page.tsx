import { IntegralLabPageClient } from "./page-client"

export default async function IntegralLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <IntegralLabPageClient serializedScene={searchParams.state ?? null} />
}
