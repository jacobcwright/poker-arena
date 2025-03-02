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

export async function GET() {
  try {
    console.log("Fetching all model stats...")

    // Get all unique models from the round table
    const { data: modelData, error: modelError } = await supabase
      .from("round")
      .select("model")
      .limit(10000)
      .order("model")

    if (modelError) {
      console.error("Error fetching models:", modelError)
      return NextResponse.json({ error: modelError.message }, { status: 500 })
    }

    // Extract unique model names
    const uniqueModels = Array.from(
      new Set(modelData.map((item: any) => item.model))
    )

    console.log(`Found ${uniqueModels.length} unique models`)

    // Get ALL balances for all models
    const { data: allBalancesData, error: allBalancesError } = await supabase
      .from("round")
      .select("model, balance, game_id")
      .limit(100000) // Set a very high limit to get all data

    if (allBalancesError) {
      console.error("Error fetching all balances:", allBalancesError)
      return NextResponse.json(
        { error: allBalancesError.message },
        { status: 500 }
      )
    }

    console.log(`Fetched ${allBalancesData?.length || 0} total balance records`)

    // Simple aggregation by model
    const modelStats = []
    const modelBalances = new Map<string, number[]>() // All balances for each model
    const modelGames = new Map<string, Set<string>>() // Track distinct games per model

    // Group all balances by model
    for (const record of allBalancesData || []) {
      const { model, balance, game_id } = record

      // Track all balances for this model
      if (!modelBalances.has(model)) {
        modelBalances.set(model, [])
      }
      modelBalances.get(model)?.push(balance)

      // Track distinct games for counting
      if (!modelGames.has(model)) {
        modelGames.set(model, new Set())
      }
      modelGames.get(model)?.add(game_id)
    }

    // Calculate average for each model
    for (const model of uniqueModels) {
      const balances = modelBalances.get(model) || []
      const gamesCount = modelGames.get(model)?.size || 0

      if (balances.length === 0) continue

      // Simple average of all balances
      const totalBalance = balances.reduce((sum, balance) => sum + balance, 0)
      const avgBalance = Math.round(totalBalance / balances.length)

      modelStats.push({
        modelName: model,
        profit: avgBalance,
        gamesCount: gamesCount,
      })
    }

    // Sort by average profit (descending)
    modelStats.sort((a, b) => b.profit - a.profit)

    console.log(`Returning stats for ${modelStats.length} models`)

    return NextResponse.json({ data: modelStats })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
