import { WebGpuUniformTransformPageClient } from "./page-client"

export default async function WebGpuUniformTransformPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGpuUniformTransformPageClient serializedScene={searchParams.state ?? null} />
}
