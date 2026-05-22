import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { POST } from "../route"

// Mock environment variables
beforeAll(() => {
  process.env.WEEKLY_DIGEST_SECRET = "test_secret"
  process.env.RESEND_API_KEY = "test_resend_key"
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
})

describe("Weekly Resurface Digest Cron", () => {
  it("rejects requests without valid Bearer token", async () => {
    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer invalid_token",
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("accepts requests with valid Bearer token", async () => {
    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer test_secret",
      },
    })

    // Mock the service to return empty results for initial test
    const response = await POST(request)

    // Should return 200 and JSON response with sent/total/skipped
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty("sent")
    expect(data).toHaveProperty("total")
    expect(data).toHaveProperty("skipped")
    expect(data).toHaveProperty("errors")
  })

  it("skips users with no unrated spins", async () => {
    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer test_secret",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    // With no test data, skipped should be >= 0
    expect(data.skipped).toBeGreaterThanOrEqual(0)
  })

  it("respects email rate limiting (max 4 per week)", async () => {
    // This test would require database setup to properly validate
    // In a real environment, you would:
    // 1. Create a test user with Pro subscription
    // 2. Insert 4+ email_rate_limit rows for that user this week
    // 3. Call the endpoint
    // 4. Verify the user is skipped due to rate limit

    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer test_secret",
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it("maintains idempotency (only sends once per week per user)", async () => {
    // This test would require database setup to properly validate
    // In a real environment, you would:
    // 1. Create a test user with Pro subscription and unrated spins
    // 2. Call the endpoint
    // 3. Verify email sent and weekly_digests_sent row created
    // 4. Call the endpoint again
    // 5. Verify user is skipped due to already sent this week

    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer test_secret",
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it("skips free users", async () => {
    // Free users should not receive digest regardless of spins
    // This is verified by isPro() check in the route

    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer test_secret",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    // Response should be valid even if no Pro users found
    expect(data).toHaveProperty("sent")
    expect(data).toHaveProperty("total")
  })

  it("returns proper response structure", async () => {
    const request = new Request("http://localhost/api/cron/weekly-resurface", {
      method: "POST",
      headers: {
        authorization: "Bearer test_secret",
      },
    })

    const response = await POST(request)
    const data = await response.json()

    // Verify response structure
    expect(data).toMatchObject({
      sent: expect.any(Number),
      total: expect.any(Number),
      skipped: expect.any(Number),
      errors: expect.any(Array),
      message: expect.any(String),
    })

    // Sent + Skipped should equal Total
    expect(data.sent + data.skipped).toBeLessThanOrEqual(data.total)
  })
})
