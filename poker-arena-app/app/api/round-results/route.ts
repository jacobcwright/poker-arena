import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Initialize Supabase client
const supabaseUrl = "https://lfcwyepxzewahcqfoxrx.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY3d5ZXB4emV3YWhjcWZveHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MjczNTgsImV4cCI6MjA1NjQwMzM1OH0.BA33QYo7htgSeZEiPWDVdAjXOGL8fg0te_HYPcwrxG0"

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const modelFilter = searchParams.get("model")
    const limit = parseInt(searchParams.get("limit") || "100")
    const roundId = searchParams.get("roundId")

    // Build query
    let query = supabase.from("round").select("*")

    // Apply filters if provided
    if (modelFilter) {
      query = query.eq("model", modelFilter)
    }

    if (roundId) {
      query = query.eq("id", roundId)
    }

    // Execute query with limit and order
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching round results:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process results for easy consumption by frontend
    const rounds = new Map()

    if (data) {
      data.forEach((row: any) => {
        const { id, model, end_balance, created_at } = row

        if (!rounds.has(id)) {
          rounds.set(id, {
            id,
            created_at,
            players: [],
          })
        }

        const round = rounds.get(id)
        round.players.push({
          model,
          end_balance,
        })
      })
    }

    const result = Array.from(rounds.values())

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
