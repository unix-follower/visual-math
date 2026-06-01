import { WebGlVelocityFieldPageClient } from "./page-client"

export default async function WebGlVelocityFieldPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlVelocityFieldPageClient serializedScene={searchParams.state ?? null} />
}
