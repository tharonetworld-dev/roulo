"use client"

import { useEffect, useState } from "react"

interface SpinRecord {
  id: string
  result: string
  created_at: string
}

interface SpinHistoryProps {
  wheelId: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function SpinHistory({ wheelId }: SpinHistoryProps) {
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
  }, [wheelId])

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Recent Spins</p>

      {loading && (
        <p className="text-xs text-muted-foreground py-2">Loading…</p>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          No spins yet — give the wheel a spin!
        </p>
      )}

      {!loading && history.length > 0 && (
        <ul className="space-y-1">
          {history.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              style={{ opacity: 1 - i * 0.04 }}
            >
              <span className="font-medium text-foreground truncate">
                {entry.result}
              </span>
              <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                {timeAgo(entry.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
