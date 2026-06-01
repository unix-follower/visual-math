import { WebGlDualPassPageClient } from "./page-client"

export default async function WebGlDualPassPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlDualPassPageClient serializedScene={searchParams.state ?? null} />
}
