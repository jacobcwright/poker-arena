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

// Define interfaces for our data types
interface RoundData {
  id: number
  model: string
  created_at: string
  round_id: string
  balance: number
  game_id: string
}

interface GameEntry {
  game_id: string
}

interface ModelEntry {
  model: string
}

interface TimeSeriesDataPoint {
  model: string
  balance: number
  timestamp: string
  gameId: string
  roundId: string
}

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const modelFilter = searchParams.get("model")
    const gameId = searchParams.get("gameId")
    const limit = parseInt(searchParams.get("limit") || "1000")

    // Build query
    let query = supabase.from("round").select("*")

    // Apply filters if provided
    if (modelFilter && modelFilter !== "all") {
      query = query.eq("model", modelFilter)
    }

    if (gameId && gameId !== "all") {
      query = query.eq("game_id", gameId)
    }

    // Execute query with limit and order by created_at
    const { data, error } = await query
      .order("created_at", { ascending: true })
      .limit(limit)

    if (error) {
      console.error("Error fetching model stats:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get all unique games
    const { data: games, error: gamesError } = await supabase
      .from("round")
      .select("game_id")
      .order("game_id")

    if (gamesError) {
      console.error("Error fetching game IDs:", gamesError)
      return NextResponse.json({ error: gamesError.message }, { status: 500 })
    }

    // Get unique game IDs
    const uniqueGames: GameEntry[] = games
      ? Array.from(new Set(games.map((g: GameEntry) => g.game_id))).map(
          (id) => ({ game_id: id })
        )
      : []

    // Get all unique models
    const { data: models, error: modelsError } = await supabase
      .from("round")
      .select("model")
      .order("model")

    if (modelsError) {
      console.error("Error fetching models:", modelsError)
      return NextResponse.json({ error: modelsError.message }, { status: 500 })
    }

    // Get unique model names
    const uniqueModels: ModelEntry[] = models
      ? Array.from(new Set(models.map((m: ModelEntry) => m.model))).map(
          (name) => ({ model: name })
        )
      : []

    // Process time series data
    // For each model or for the selected model, track balance over time
    const timeSeriesData: TimeSeriesDataPoint[] = (data as RoundData[]).map(
      (entry) => ({
        model: entry.model,
        balance: entry.balance,
        timestamp: entry.created_at,
        gameId: entry.game_id,
        roundId: entry.round_id,
      })
    )

    return NextResponse.json({
      data: timeSeriesData,
      games: uniqueGames.map((g: GameEntry) => g.game_id),
      models: uniqueModels.map((m: ModelEntry) => m.model),
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
