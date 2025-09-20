import { Loader2 } from "lucide-react"

export default function UnternehmenLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      <span className="ml-2 text-white">Unternehmen werden geladen...</span>
    </div>
  )
}
