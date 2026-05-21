"use client"

import { useState } from "react"
import { SpinWheel, type WheelItem } from "@/components/SpinWheel"
import { EditPanel } from "@/components/EditPanel"
import { AIGeneratePanel } from "@/components/AIGeneratePanel"

interface WheelViewProps {
  wheelId: string
  initialName: string
  initialItems: WheelItem[]
}

export function WheelView({ wheelId, initialName, initialItems }: WheelViewProps) {
  const [items, setItems] = useState<WheelItem[]>(initialItems)
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roulo</h1>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setAiOpen((v) => !v); setEditing(false) }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {aiOpen ? "Close AI" : "✨ AI"}
          </button>
          <button
            onClick={() => { setEditing((v) => !v); setAiOpen(false) }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Wheel — always visible */}
      {items.length >= 2 ? (
        <SpinWheel wheelId={wheelId} items={items} />
      ) : (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Add at least 2 items to spin the wheel.
        </p>
      )}

      {/* AI Generate panel */}
      {aiOpen && (
        <AIGeneratePanel
          wheelId={wheelId}
          onItemsChange={(newItems) => {
            setItems(newItems)
            setAiOpen(false)
          }}
        />
      )}

      {/* Edit panel — shown when editing */}
      {editing && (
        <div className="border-t pt-6">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            Edit Wheel
          </h2>
          <EditPanel
            wheelId={wheelId}
            wheelName={name}
            items={items}
            onNameChange={setName}
            onItemsChange={setItems}
          />
        </div>
      )}
    </div>
  )
}
