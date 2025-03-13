import { Suspense } from "react"
import { InstanceSelector } from "@/components/instance-selector"
import { Loader2 } from "lucide-react"
import { Providers } from "@/components/providers"

export default function SelectInstancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <h1 className="mb-8 text-center text-3xl font-bold">Train Dispatcher Console</h1>
        <div className="rounded-lg border bg-card p-6 shadow-lg">
          <h2 className="mb-6 text-xl font-semibold">Select Railroad Division</h2>
          <Suspense fallback={<InstanceSelectorLoading />}>
            <Providers>
              <InstanceSelector />
            </Providers>
          </Suspense>
        </div>
      </div>
    </main>
  )
}

function InstanceSelectorLoading() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading railroad divisions...</span>
    </div>
  )
}

