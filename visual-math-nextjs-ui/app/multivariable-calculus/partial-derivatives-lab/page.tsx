import { PartialDerivativesLabPageClient } from "./page-client"

export default async function PartialDerivativesLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <PartialDerivativesLabPageClient serializedScene={searchParams.state ?? null} />
}
