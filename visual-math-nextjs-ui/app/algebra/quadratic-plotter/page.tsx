import { QuadraticPlotterPageClient } from "./page-client"

export default async function QuadraticPlotterPage(props: {
  readonly searchParams: Promise<{ readonly state?: string }>
}) {
  const searchParams = await props.searchParams

  return <QuadraticPlotterPageClient serializedScene={searchParams.state ?? null} />
}
