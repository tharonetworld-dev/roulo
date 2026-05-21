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
        <ul className="space-y-1">
          {history.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center rounded-lg px-3 py-2 text-sm bg-muted/50"
              style={{ opacity: Math.max(0.35, 1 - i * 0.07) }}
            >
              <span className="font-medium text-foreground truncate">
                {entry.result}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
