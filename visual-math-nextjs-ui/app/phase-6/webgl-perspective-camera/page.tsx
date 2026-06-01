import { WebGlPerspectiveCameraPageClient } from "./page-client"

export default async function WebGlPerspectiveCameraPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlPerspectiveCameraPageClient serializedScene={searchParams.state ?? null} />
}
