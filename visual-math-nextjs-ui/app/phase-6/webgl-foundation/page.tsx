import { WebGlFoundationPageClient } from "./page-client"

export default async function WebGlFoundationPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlFoundationPageClient serializedScene={searchParams.state ?? null} />
}
