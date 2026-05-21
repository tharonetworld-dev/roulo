"use client"

import { useState } from "react"
import { SpinWheel, type WheelItem } from "@/components/SpinWheel"
import { EditPanel } from "@/components/EditPanel"
import { AIGeneratePanel } from "@/components/AIGeneratePanel"
import { WheelSwitcher, type WheelSummary } from "@/components/WheelSwitcher"

interface WheelViewProps {
  initialWheels: WheelSummary[]
  activeWheelId: string
}

export function WheelView({ initialWheels, activeWheelId }: WheelViewProps) {
  const [wheels, setWheels] = useState<WheelSummary[]>(initialWheels)
  const [currentId, setCurrentId] = useState(activeWheelId)

  const current = wheels.find((w) => w.id === currentId) ?? wheels[0]
  const [items, setItems] = useState<WheelItem[]>(
    current?.wheel_items?.slice().sort((a, b) => (a as WheelItem & { position: number }).position - (b as WheelItem & { position: number }).position) ?? []
  )
  const [name, setName] = useState(current?.name ?? "")

  const [panel, setPanel] = useState<"none" | "edit" | "ai" | "wheels">("none")

  // Keep items + the wheels[] entry in sync so counts and state are correct when switching
  function applyItems(newItems: WheelItem[], wheelId = currentId) {
    setItems(newItems)
    setWheels((prev) =>
      prev.map((w) => (w.id === wheelId ? { ...w, wheel_items: newItems } : w))
    )
  }

  function switchWheel(wheel: WheelSummary) {
    const sorted = (wheel.wheel_items ?? [])
      .slice()
      .sort((a, b) => (a as WheelItem & { position: number }).position - (b as WheelItem & { position: number }).position)
    setCurrentId(wheel.id)
    setItems(sorted)   // direct set — we're switching, not mutating this wheel's stored items
    setName(wheel.name)
    setPanel("none")
  }

  function handleWheelCreated(wheel: WheelSummary) {
    setWheels((prev) => [wheel, ...prev])
    switchWheel(wheel)
  }

  function handleWheelDeleted(wheelId: string) {
    const remaining = wheels.filter((w) => w.id !== wheelId)
    setWheels(remaining)
    if (wheelId === currentId && remaining.length > 0) {
      switchWheel(remaining[0])
    }
  }

  function toggle(p: "edit" | "ai" | "wheels") {
    setPanel((prev) => (prev === p ? "none" : p))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roulo</h1>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggle("wheels")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {panel === "wheels" ? "Close" : "Wheels"}
          </button>
          <button
            onClick={() => toggle("ai")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {panel === "ai" ? "Close AI" : "✨ AI"}
          </button>
          <button
            onClick={() => toggle("edit")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {panel === "edit" ? "Done" : "Edit"}
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
        <SpinWheel wheelId={currentId} items={items} />
      ) : (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Add at least 2 items to spin the wheel.
        </p>
      )}

      {/* Wheels panel */}
      {panel === "wheels" && (
        <WheelSwitcher
          wheels={wheels}
          activeWheelId={currentId}
          onSwitch={switchWheel}
          onWheelCreated={handleWheelCreated}
          onWheelDeleted={handleWheelDeleted}
        />
      )}

      {/* AI Generate panel */}
      {panel === "ai" && (
        <AIGeneratePanel
          wheelId={currentId}
          onItemsChange={(newItems) => {
            applyItems(newItems)
            setPanel("none")
          }}
        />
      )}

      {/* Edit panel */}
      {panel === "edit" && (
        <div className="border-t pt-6">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
            Edit Wheel
          </h2>
          <EditPanel
            wheelId={currentId}
            wheelName={name}
            items={items}
            onNameChange={(n) => {
              setName(n)
              setWheels((prev) =>
                prev.map((w) => (w.id === currentId ? { ...w, name: n } : w))
              )
            }}
            onItemsChange={applyItems}
          />
        </div>
      )}
    </div>
  )
}
