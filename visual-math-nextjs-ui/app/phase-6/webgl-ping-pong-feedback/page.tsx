import { WebGlPingPongFeedbackPageClient } from "./page-client"

export default async function WebGlPingPongFeedbackPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlPingPongFeedbackPageClient serializedScene={searchParams.state ?? null} />
}
