import { WebGlBloomBlurPageClient } from "./page-client"

export default async function WebGlBloomBlurPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <WebGlBloomBlurPageClient serializedScene={searchParams.state ?? null} />
}
