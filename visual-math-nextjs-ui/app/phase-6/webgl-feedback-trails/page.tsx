import { WebGlFeedbackTrailsPageClient } from "./page-client"

export default async function WebGlFeedbackTrailsPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlFeedbackTrailsPageClient serializedScene={searchParams.state ?? null} />
}
