import { WebGpuFoundationPageClient } from "./page-client"

export default async function WebGpuFoundationPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuFoundationPageClient serializedScene={searchParams.state ?? null} />
}
