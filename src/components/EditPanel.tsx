"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WHEEL_COLORS } from "@/lib/wheel-colors"
import type { WheelItem } from "@/components/SpinWheel"

interface EditPanelProps {
  wheelId: string
  wheelName: string
  items: WheelItem[]
  onNameChange: (name: string) => void
  onItemsChange: (items: WheelItem[]) => void
}

export function EditPanel({
  wheelId,
  wheelName,
  items,
  onNameChange,
  onItemsChange,
}: EditPanelProps) {
  const [nameVal, setNameVal] = useState(wheelName)
  const [nameSaving, setNameSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)

  // ── Rename wheel ──────────────────────────────────────────────
  async function saveWheelName() {
    const trimmed = nameVal.trim()
    if (!trimmed || trimmed === wheelName) return
    setNameSaving(true)
    const res = await fetch(`/api/wheels/${wheelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    if (res.ok) onNameChange(trimmed)
    else setError("Failed to rename wheel")
    setNameSaving(false)
  }

  // ── Edit item label ───────────────────────────────────────────
  function startEdit(item: WheelItem) {
    setEditingId(item.id)
    setEditVal(item.label)
    setError(null)
  }

  async function saveEdit(item: WheelItem) {
    const trimmed = editVal.trim()
    setEditingId(null)
    if (!trimmed || trimmed === item.label) return
    const res = await fetch(`/api/wheels/${wheelId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed }),
    })
    if (res.ok) {
      onItemsChange(items.map((i) => (i.id === item.id ? { ...i, label: trimmed } : i)))
    } else {
      setError("Failed to save item")
    }
  }

  // ── Delete item ───────────────────────────────────────────────
  async function deleteItem(id: string) {
    if (items.length <= 2) {
      setError("A wheel needs at least 2 items")
      return
    }
    const res = await fetch(`/api/wheels/${wheelId}/items/${id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      onItemsChange(items.filter((i) => i.id !== id))
    } else {
      setError("Failed to delete item")
    }
  }

  // ── Add item ──────────────────────────────────────────────────
  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newLabel.trim()
    if (!trimmed) return
    setAdding(true)
    setError(null)
    const res = await fetch(`/api/wheels/${wheelId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed, weight: 1 }),
    })
    if (res.ok) {
      const newItem = await res.json()
      onItemsChange([...items, newItem])
      setNewLabel("")
      newInputRef.current?.focus()
    } else {
      setError("Failed to add item")
    }
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Wheel name */}
      <div className="flex gap-2 items-center">
        <Input
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={saveWheelName}
          onKeyDown={(e) => e.key === "Enter" && saveWheelName()}
          placeholder="Wheel name"
          className="text-sm font-medium"
          disabled={nameSaving}
        />
      </div>

      {/* Item list */}
      <div className="flex flex-col gap-1">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
          >
            {/* Color dot */}
            <span
              className="shrink-0 h-3 w-3 rounded-full"
              style={{ backgroundColor: WHEEL_COLORS[idx % WHEEL_COLORS.length] }}
            />

            {/* Label — inline edit */}
            {editingId === item.id ? (
              <input
                autoFocus
                className="flex-1 text-sm bg-transparent outline-none border-b border-ring"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => saveEdit(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(item)
                  if (e.key === "Escape") setEditingId(null)
                }}
              />
            ) : (
              <span
                className="flex-1 text-sm cursor-pointer hover:text-primary truncate"
                onClick={() => startEdit(item)}
              >
                {item.label}
              </span>
            )}

            {/* Edit icon */}
            {editingId !== item.id && (
              <button
                onClick={() => startEdit(item)}
                className="shrink-0 text-muted-foreground hover:text-foreground text-xs px-1"
                aria-label="Edit"
              >
                ✏️
              </button>
            )}

            {/* Delete icon */}
            <button
              onClick={() => deleteItem(item.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive text-xs px-1"
              aria-label="Delete"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      <form onSubmit={addItem} className="flex gap-2">
        <Input
          ref={newInputRef}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add an option…"
          className="text-sm"
          maxLength={40}
        />
        <Button type="submit" disabled={adding || !newLabel.trim()} size="sm">
          Add
        </Button>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
