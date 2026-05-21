"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WheelItem } from "@/components/SpinWheel"

interface AIGeneratePanelProps {
  wheelId: string
  onItemsChange: (items: WheelItem[]) => void
}

export function AIGeneratePanel({ wheelId, onItemsChange }: AIGeneratePanelProps) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError("")

    try {
      // 1. Generate labels via AI
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error || "Generation failed")

      // 2. Bulk-replace wheel items
      const replaceRes = await fetch(`/api/wheels/${wheelId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: genData.labels }),
      })
      const replaceData = await replaceRes.json()
      if (!replaceRes.ok) throw new Error(replaceData.error || "Replace failed")

      // Sort by position and update parent
      const sorted: WheelItem[] = [...replaceData].sort(
        (a: WheelItem & { position: number }, b: WheelItem & { position: number }) =>
          a.position - b.position
      )
      onItemsChange(sorted)
      setPrompt("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">
        ✨ AI Wheel Generator
      </p>
      <p className="text-xs text-muted-foreground">
        Describe your decision and AI will fill the wheel with options.
      </p>
      <form onSubmit={handleGenerate} className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. what to eat for dinner"
          disabled={loading}
          className="flex-1 text-sm"
        />
        <Button type="submit" disabled={loading || !prompt.trim()} size="sm">
          {loading ? "…" : "Generate"}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
