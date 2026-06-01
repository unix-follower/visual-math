import { WebGlTemporalFeedbackPageClient } from "./page-client"

export default async function WebGlTemporalFeedbackPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlTemporalFeedbackPageClient serializedScene={searchParams.state ?? null} />
}
