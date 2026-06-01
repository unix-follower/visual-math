import { DerivativeLabPageClient } from "./page-client"

export default async function DerivativeLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <DerivativeLabPageClient serializedScene={searchParams.state ?? null} />
}
