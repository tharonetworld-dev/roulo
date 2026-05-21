"use client"

import { useEffect, useState } from "react"

interface SpinRecord {
  id: string
  result: string
}

interface SpinHistoryProps {
  wheelId: string
  refreshKey?: number
}

export function SpinHistory({ wheelId, refreshKey = 0 }: SpinHistoryProps) {
  const [history, setHistory] = useState<SpinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    setError("")
    fetch(`/api/wheels/${wheelId}/history`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data)
        else setError(data.error || "Failed to load history")
      })
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false))
  }, [wheelId, refreshKey])

  async function handleClear() {
    if (clearing) return
    setClearing(true)
    setError("")
    try {
      const res = await fetch(`/api/wheels/${wheelId}/history`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Delete failed")
      }
      setHistory([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear history")
    } finally {
      setClearing(false)
    }
  }

  const total = history.length

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
        Recent Spins
      </p>

      {loading && (
        <p className="text-xs text-muted-foreground px-1 py-2">Loading…</p>
      )}

      {error && (
        <p className="text-xs text-destructive px-1">{error}</p>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="text-xs text-muted-foreground px-1 py-2">
          No spins yet!
        </p>
      )}

      {!loading && history.length > 0 && (
        <>
          <ul className="space-y-1">
            {history.map((entry, i) => (
              <li
                key={entry.id}
                className="flex items-center rounded-lg px-3 py-2 text-sm bg-muted/50"
                style={{ opacity: Math.max(0.35, 1 - (total - 1 - i) * 0.07) }}
              >
                <span className="w-5 shrink-0 text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="font-medium text-foreground truncate">
                  {entry.result}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleClear}
            disabled={clearing}
            className="w-full mt-1 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors text-left"
          >
            {clearing ? "Clearing…" : "Clear history"}
          </button>
        </>
      )}
    </div>
  )
}
