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

// Define interfaces
interface RoundData {
  id: number
  model: string
  created_at: string
  round_id: string
  balance: number
  game_id: string
}

interface ModelWins {
  model: string
  wins: number
  totalGames: number
  winRate: number
}

export async function GET() {
  try {
    console.log("Fetching model wins data...")

    // Get all round data
    const { data: roundData, error: roundError } = await supabase
      .from("round")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100000) // Set a high limit to get all data

    if (roundError) {
      console.error("Error fetching round data:", roundError)
      return NextResponse.json({ error: roundError.message }, { status: 500 })
    }

    // Get unique game IDs
    const gameIds = Array.from(
      new Set(roundData.map((item: RoundData) => item.game_id))
    )

    console.log(`Found ${gameIds.length} unique games`)

    // For each game, determine the winner (highest balance)
    const gameWinners = new Map<string, string>() // game_id -> winning model
    const modelParticipations = new Map<string, Set<string>>() // model -> set of games

    // Group entries by game
    const gameEntries = new Map<string, RoundData[]>()

    for (const entry of roundData) {
      if (!gameEntries.has(entry.game_id)) {
        gameEntries.set(entry.game_id, [])
      }
      gameEntries.get(entry.game_id)?.push(entry)

      // Track model participation in games
      if (!modelParticipations.has(entry.model)) {
        modelParticipations.set(entry.model, new Set())
      }
      modelParticipations.get(entry.model)?.add(entry.game_id)
    }

    // Find the winner for each game
    for (const [gameId, entries] of gameEntries.entries()) {
      // Sort entries by created_at to get the latest entry for each model
      const latestEntries = new Map<string, RoundData>()

      for (const entry of entries) {
        const currentLatest = latestEntries.get(entry.model)

        if (
          !currentLatest ||
          new Date(entry.created_at) > new Date(currentLatest.created_at)
        ) {
          latestEntries.set(entry.model, entry)
        }
      }

      // Find the model with the highest final balance
      let highestBalance = -Infinity
      let winner = ""

      for (const [model, entry] of latestEntries.entries()) {
        if (entry.balance > highestBalance) {
          highestBalance = entry.balance
          winner = model
        }
      }

      if (winner) {
        gameWinners.set(gameId, winner)
      }
    }

    // Count wins for each model
    const modelWins = new Map<string, number>()

    for (const winner of gameWinners.values()) {
      modelWins.set(winner, (modelWins.get(winner) || 0) + 1)
    }

    // Get all unique models
    const uniqueModels = Array.from(
      new Set(roundData.map((item: RoundData) => item.model))
    )

    // Prepare final response data
    const winsData: ModelWins[] = uniqueModels.map((model) => {
      const wins = modelWins.get(model) || 0
      const totalGames = modelParticipations.get(model)?.size || 0
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0

      return {
        model,
        wins,
        totalGames,
        winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
      }
    })

    // Sort by number of wins (descending)
    winsData.sort((a, b) => b.wins - a.wins)

    console.log(`Returning wins data for ${winsData.length} models`)

    return NextResponse.json({ data: winsData })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
