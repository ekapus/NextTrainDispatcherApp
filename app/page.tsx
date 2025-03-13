import { Suspense } from "react"
import { RailroadSchematic } from "@/components/railroad-schematic"
import { ClearancePanel } from "@/components/clearance-panel"
import { Providers } from "@/components/providers"
import { InstanceDisplay } from "@/components/instance-display"
import { RefreshButton } from "@/components/refresh-button"
import { Loader2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackgroundColorProvider } from "@/components/background-color-provider"

export default function HomePage() {
  return (
    <Providers>
      <BackgroundColorProvider>
        <main className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b px-6 py-3">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">Train Dispatcher Console</h1>
              <InstanceDisplay />
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton />
              <Button variant="outline" size="sm" asChild>
                <a href="/select-instance">Change Division</a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="/diagnostics" className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  Diagnostics
                </a>
              </Button>
            </div>
          </header>
          <div className="app-holder flex flex-col flex-1 p-6 space-y-6">
            {/* Railroad Schematic Section */}
            <div className="">
              <Suspense fallback={<SchematicLoading />}>
                <RailroadSchematic />
              </Suspense>
            </div>

            {/* Form D Panel Section */}
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <Suspense fallback={<ClearancePanelLoading />}>
                <ClearancePanel />
              </Suspense>
            </div>
          </div>
        </main>
      </BackgroundColorProvider>
    </Providers>
  )
}

function SchematicLoading() {
  return (
    <div className="flex h-[500px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading railroad schematic...</span>
    </div>
  )
}

function ClearancePanelLoading() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading clearance data...</span>
    </div>
  )
}

