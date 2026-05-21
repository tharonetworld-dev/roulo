"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { WHEEL_COLORS as COLORS } from "@/lib/wheel-colors"

const SIZE = 300 // logical px
const DPR = 2   // render at 2× for retina sharpness

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

export interface WheelItem {
  id: string
  label: string
  weight: number
}

interface SpinWheelProps {
  wheelId: string
  items: WheelItem[]
}

export function SpinWheel({ wheelId, items }: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0)

  const draw = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const cx = SIZE / 2
      const cy = SIZE / 2
      const r = SIZE / 2 - 28

      ctx.clearRect(0, 0, SIZE, SIZE)

      // Draw wheel segments
      let angle = rotation - Math.PI / 2 // 0 = top

      items.forEach((item, idx) => {
        const slice = (item.weight / totalWeight) * Math.PI * 2

        // Fill segment
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, r, angle, angle + slice)
        ctx.closePath()
        ctx.fillStyle = COLORS[idx % COLORS.length]
        ctx.fill()

        // Segment border
        ctx.strokeStyle = "rgba(255,255,255,0.7)"
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Label text — always read left-to-right by flipping segments on the left half
        ctx.save()
        ctx.translate(cx, cy)
        const midAngle = angle + slice / 2
        const isLeftHalf = Math.cos(midAngle) < 0
        ctx.rotate(midAngle)
        ctx.shadowColor = "rgba(0,0,0,0.4)"
        ctx.shadowBlur = 3
        const fontSize = Math.max(9, Math.min(13, 120 / items.length))
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
        const maxLen = 15
        const label =
          item.label.length > maxLen
            ? item.label.slice(0, maxLen - 1) + "…"
            : item.label
        ctx.fillStyle = "#ffffff"
        if (isLeftHalf) {
          // Flip so text reads left-to-right
          ctx.rotate(Math.PI)
          ctx.textAlign = "left"
          ctx.fillText(label, -(r - 10), fontSize * 0.38)
        } else {
          ctx.textAlign = "right"
          ctx.fillText(label, r - 10, fontSize * 0.38)
        }
        ctx.restore()

        angle += slice
      })

      // Outer ring stroke
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(255,255,255,0.4)"
      ctx.lineWidth = 3
      ctx.stroke()

      // Center hub
      ctx.beginPath()
      ctx.arc(cx, cy, 16, 0, Math.PI * 2)
      ctx.fillStyle = "#0f172a"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.6)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Pointer: downward triangle sitting above the wheel, tip touching rim
      const tipX = cx
      const tipY = cy - r + 2      // tip just inside rim
      const baseY = tipY - 20      // base above rim
      ctx.beginPath()
      ctx.moveTo(tipX, tipY)
      ctx.lineTo(tipX - 11, baseY)
      ctx.lineTo(tipX + 11, baseY)
      ctx.closePath()
      ctx.fillStyle = "#0f172a"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.8)"
      ctx.lineWidth = 2
      ctx.stroke()
    },
    [items, totalWeight]
  )

  // One-time canvas setup — scale for retina, never re-run
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = SIZE * DPR
    canvas.height = SIZE * DPR
    canvas.style.width = `${SIZE}px`
    canvas.style.height = `${SIZE}px`
    const ctx = canvas.getContext("2d")
    ctx?.scale(DPR, DPR)
  }, []) // ← empty: runs once only

  // Redraw whenever items change (draw recreated when items/totalWeight change)
  useEffect(() => {
    draw(rotationRef.current)
  }, [draw])

  function pickWinner(): WheelItem {
    let rand = Math.random() * totalWeight
    for (const item of items) {
      rand -= item.weight
      if (rand <= 0) return item
    }
    return items[items.length - 1]
  }

  function targetRotationForWinner(winner: WheelItem): number {
    // Walk through segments to find winner's center angle
    let startAngle = 0
    for (const item of items) {
      const slice = (item.weight / totalWeight) * Math.PI * 2
      if (item.id === winner.id) {
        const centerAngle = startAngle + slice / 2
        // draw() renders segment i at canvas angle: (rotation - π/2 + wheelAngle_i)
        // Pointer is fixed at canvas angle -π/2 (top).
        // Pointer hits wheel angle θ when: rotation - π/2 + θ = -π/2 + 2πk
        //   → rotation = -θ + 2πk  → finalRotation ≡ -centerAngle (mod 2π)
        const base = rotationRef.current % (2 * Math.PI)
        let extra = (-centerAngle - base) % (2 * Math.PI)
        if (extra <= 0) extra += 2 * Math.PI   // always spin forward
        // Add 4–6 full rotations for satisfying animation
        const fullSpins = (4 + Math.floor(Math.random() * 3)) * 2 * Math.PI
        return rotationRef.current + extra + fullSpins
      }
      startAngle += slice
    }
    return rotationRef.current + 10 * Math.PI
  }

  async function handleSpin() {
    if (spinning || items.length === 0) return
    setSpinning(true)
    setResult(null)
    setShowResult(false)

    const winner = pickWinner()
    const target = targetRotationForWinner(winner)
    const start = rotationRef.current
    const duration = 4500 + Math.random() * 800
    const t0 = performance.now()

    function frame(now: number) {
      const t = Math.min((now - t0) / duration, 1)
      const rot = start + (target - start) * easeOutQuart(t)
      rotationRef.current = rot
      draw(rot)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        rotationRef.current = target
        draw(target)
        setSpinning(false)
        setResult(winner.label)
        setShowResult(true)

        // Fire-and-forget save
        fetch("/api/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wheel_id: wheelId, result: winner.label }),
        }).catch(console.error)
      }
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Canvas wheel */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="drop-shadow-2xl rounded-full"
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Spin button */}
      <Button
        size="lg"
        className="w-36 text-base font-semibold"
        onClick={handleSpin}
        disabled={spinning}
      >
        {spinning ? "Spinning…" : "Spin"}
      </Button>

      {/* Result */}
      {showResult && result && !spinning && (
        <div
          className="text-center"
          style={{
            animation: "fadeSlideIn 0.35s ease-out both",
          }}
        >
          <p className="text-sm text-muted-foreground mb-1">The wheel says…</p>
          <p className="text-3xl font-bold tracking-tight">{result}</p>
          <button
            onClick={() => {
              setShowResult(false)
              setResult(null)
            }}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-2"
          >
            spin again
          </button>
        </div>
      )}
    </div>
  )
}
