import { SamplingLabPageClient } from "./page-client"

export default async function SamplingLabPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <SamplingLabPageClient serializedScene={searchParams.state ?? null} />
}
