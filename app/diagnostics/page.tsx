import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { DirectDiagnostics } from "@/components/direct-diagnostics"
import { BasicDiagnostics } from "@/components/basic-diagnostics"

export default function DiagnosticsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Train Dispatcher Diagnostics</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-sm text-blue-500 hover:underline">
            Return to Main Console
          </a>
        </div>
      </header>
      <div className="flex-1 p-6 space-y-6">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic Diagnostics</TabsTrigger>
            <TabsTrigger value="full">Full Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <BasicDiagnostics />
          </TabsContent>

          <TabsContent value="full" className="mt-4">
            <Suspense fallback={<DiagnosticsLoading />}>
              <DirectDiagnostics />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function DiagnosticsLoading() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading diagnostics tools...</span>
    </div>
  )
}

