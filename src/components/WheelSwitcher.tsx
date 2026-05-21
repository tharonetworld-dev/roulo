"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WheelItem } from "@/components/SpinWheel"

export interface WheelSummary {
  id: string
  name: string
  wheel_items: WheelItem[]
}

interface WheelSwitcherProps {
  wheels: WheelSummary[]
  activeWheelId: string
  onSwitch: (wheel: WheelSummary) => void
  onWheelCreated: (wheel: WheelSummary) => void
  onWheelDeleted: (wheelId: string) => void
}

const DEFAULT_ITEMS = [
  { label: "Option A", weight: 1 },
  { label: "Option B", weight: 1 },
  { label: "Option C", weight: 1 },
]

export function WheelSwitcher({
  wheels,
  activeWheelId,
  onSwitch,
  onWheelCreated,
  onWheelDeleted,
}: WheelSwitcherProps) {
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || creating) return
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/wheels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          items: DEFAULT_ITEMS,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create wheel")

      // Fetch the full wheel with items
      const fullRes = await fetch("/api/wheels")
      const allWheels: WheelSummary[] = await fullRes.json()
      const created = allWheels.find((w) => w.id === data.id)
      if (created) {
        onWheelCreated(created)
        setNewName("")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating wheel")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(wheelId: string) {
    if (deletingId) return
    setDeletingId(wheelId)
    try {
      const res = await fetch(`/api/wheels/${wheelId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete")
      }
      onWheelDeleted(wheelId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting wheel")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
        My Wheels
      </p>

      {/* Wheel list */}
      <ul className="space-y-1">
        {wheels.map((w) => (
          <li
            key={w.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              w.id === activeWheelId
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted cursor-pointer"
            }`}
          >
            <span
              className="flex-1 truncate"
              onClick={() => w.id !== activeWheelId && onSwitch(w)}
            >
              {w.name}
              <span
                className={`ml-2 text-xs ${
                  w.id === activeWheelId
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                ({w.wheel_items?.length ?? 0} items)
              </span>
            </span>
            {wheels.length > 1 && (
              <button
                onClick={() => handleDelete(w.id)}
                disabled={deletingId === w.id}
                className={`ml-2 text-xs transition-colors ${
                  w.id === activeWheelId
                    ? "text-primary-foreground/70 hover:text-primary-foreground"
                    : "text-muted-foreground hover:text-destructive"
                }`}
              >
                {deletingId === w.id ? "…" : "🗑"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Create new wheel */}
      <form onSubmit={handleCreate} className="flex gap-2 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New wheel name…"
          disabled={creating}
          className="flex-1 text-sm"
        />
        <Button type="submit" size="sm" disabled={creating || !newName.trim()}>
          {creating ? "…" : "Add"}
        </Button>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
