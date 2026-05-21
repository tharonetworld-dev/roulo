"use client"

import { useState } from "react"
import { SpinWheel, type WheelItem } from "@/components/SpinWheel"
import { EditPanel } from "@/components/EditPanel"
import { AIGeneratePanel } from "@/components/AIGeneratePanel"
import { WheelSwitcher, type WheelSummary } from "@/components/WheelSwitcher"
import { SpinHistory } from "@/components/SpinHistory"

interface WheelViewProps {
  initialWheels: WheelSummary[]
  activeWheelId: string
}

export function WheelView({ initialWheels, activeWheelId }: WheelViewProps) {
  const [wheels, setWheels] = useState<WheelSummary[]>(initialWheels)
  const [currentId, setCurrentId] = useState(activeWheelId)
  const [spinCount, setSpinCount] = useState(0)

  const current = wheels.find((w) => w.id === currentId) ?? wheels[0]
  const [items, setItems] = useState<WheelItem[]>(
    current?.wheel_items
      ?.slice()
      .sort(
        (a, b) =>
          (a as WheelItem & { position: number }).position -
          (b as WheelItem & { position: number }).position
      ) ?? []
  )
  const [name, setName] = useState(current?.name ?? "")
  const [subPanel, setSubPanel] = useState<"none" | "edit" | "ai">("none")

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
      .sort(
        (a, b) =>
          (a as WheelItem & { position: number }).position -
          (b as WheelItem & { position: number }).position
      )
    setCurrentId(wheel.id)
    setItems(sorted)
    setName(wheel.name)
    setSubPanel("none")
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

  function toggleSub(p: "edit" | "ai") {
    setSubPanel((prev) => (prev === p ? "none" : p))
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Roulo</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleSub("ai")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {subPanel === "ai" ? "Close AI" : "✨ AI"}
          </button>
          <button
            onClick={() => toggleSub("edit")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {subPanel === "edit" ? "Done" : "Edit"}
          </button>
          <button
            onClick={async () => {
              const res = await fetch("/api/portal", { method: "POST" })
              const data = await res.json()
              if (data.url) window.location.href = data.url
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Billing
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

      {/* Three-column layout (stacks on mobile) */}
      <div className="flex flex-col lg:grid lg:grid-cols-[220px_1fr_220px] gap-6 items-start">

        {/* LEFT — Wheels list */}
        <div className="order-2 lg:order-1 w-full">
          <WheelSwitcher
            wheels={wheels}
            activeWheelId={currentId}
            onSwitch={switchWheel}
            onWheelCreated={handleWheelCreated}
            onWheelDeleted={handleWheelDeleted}
          />
        </div>

        {/* CENTER — Wheel + sub-panels */}
        <div className="order-1 lg:order-2 flex flex-col items-center gap-4 w-full">
          <p className="text-base font-semibold text-foreground">{name}</p>

          {items.length >= 2 ? (
            <SpinWheel
              key={currentId}
              wheelId={currentId}
              items={items}
              onSpinComplete={() => setSpinCount((c) => c + 1)}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Add at least 2 items to spin the wheel.
            </p>
          )}

          {/* AI Generate panel */}
          {subPanel === "ai" && (
            <div className="w-full max-w-sm">
              <AIGeneratePanel
                wheelId={currentId}
                onItemsChange={(newItems) => {
                  applyItems(newItems)
                  setSubPanel("none")
                }}
              />
            </div>
          )}

          {/* Edit panel */}
          {subPanel === "edit" && (
            <div className="w-full max-w-sm border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Edit Wheel
              </p>
              <EditPanel
                wheelId={currentId}
                wheelName={name}
                items={items}
                onNameChange={(n) => {
                  setName(n)
                  setWheels((prev) =>
                    prev.map((w) =>
                      w.id === currentId ? { ...w, name: n } : w
                    )
                  )
                }}
                onItemsChange={applyItems}
              />
            </div>
          )}
        </div>

        {/* RIGHT — Spin history */}
        <div className="order-3 w-full">
          <SpinHistory wheelId={currentId} refreshKey={spinCount} />
        </div>
      </div>
    </div>
  )
}
