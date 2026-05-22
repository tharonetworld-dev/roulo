import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: { spinId: string } }
) {
  const spinId = params.spinId
  const url = new URL(request.url)
  const rating = url.searchParams.get("rating")

  if (!rating || !["positive", "negative", "didnt_try"].includes(rating)) {
    return NextResponse.json(
      { error: "Invalid rating. Must be positive, negative, or didnt_try." },
      { status: 400 }
    )
  }

  const service = createServiceClient()

  // Get the spin to find user_id
  const { data: spin, error: spinError } = await service
    .from("wheel_spins")
    .select("user_id")
    .eq("id", spinId)
    .single()

  if (spinError || !spin) {
    return NextResponse.json({ error: "Spin not found" }, { status: 404 })
  }

  // Insert or update the outcome
  const { error: outcomeError } = await service
    .from("wheel_outcomes")
    .upsert(
      {
        spin_id: spinId,
        user_id: spin.user_id,
        rating,
      },
      { onConflict: "spin_id" }
    )

  if (outcomeError) {
    console.error("Outcome error:", outcomeError)
    return NextResponse.json(
      { error: outcomeError.message },
      { status: 500 }
    )
  }

  // Return a simple success page
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thanks!</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f4f6; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
          h1 { color: #1f2937; margin: 0 0 10px 0; }
          p { color: #6b7280; margin: 0 0 30px 0; }
          a { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✓ Thanks for the feedback!</h1>
          <p>We've recorded your rating. See you next spin!</p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://roulo.app"}">Back to Roulo</a>
        </div>
      </body>
    </html>
    `,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  )
}
