import { WebGlInteractiveDyePageClient } from "./page-client"

export default async function WebGlInteractiveDyePage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlInteractiveDyePageClient serializedScene={searchParams.state ?? null} />
}
