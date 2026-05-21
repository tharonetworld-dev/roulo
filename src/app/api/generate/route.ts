import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  // Auth check
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prompt } = await request.json()
  if (!prompt?.trim())
    return NextResponse.json({ error: "Prompt required" }, { status: 400 })

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Generate 5–8 short options for a decision-spinning wheel. The user wants help deciding: "${prompt.trim()}"

Rules:
- Return ONLY a valid JSON array of strings
- Each option must be 1–4 words, punchy and distinct
- No explanations, no markdown fences, no extra text — just the raw JSON array

Example output: ["Option A","Option B","Option C","Option D","Option E"]`,
        },
      ],
    })

    const raw = message.content[0].type === "text" ? message.content[0].text : ""

    // Parse — strip any accidental markdown fences
    const cleaned = raw.replace(/```json?/g, "").replace(/```/g, "").trim()
    const labels: string[] = JSON.parse(cleaned)

    if (!Array.isArray(labels) || labels.length < 2)
      throw new Error("Invalid response shape")

    // Log to ai_generations
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      prompt: prompt.trim(),
      type: "wheel_items",
    })

    return NextResponse.json({ labels: labels.slice(0, 8) })
  } catch (err) {
    console.error("Generate error:", err)
    return NextResponse.json(
      { error: "Failed to generate items. Try a different prompt." },
      { status: 500 }
    )
  }
}
