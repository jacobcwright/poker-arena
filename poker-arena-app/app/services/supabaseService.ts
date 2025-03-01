import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Publish player end balances to Supabase
 * @param players Array of players with their information
 * @param roundId Optional round ID, will generate a new one if not provided
 */
export const publishRoundResults = async (
  players: Array<{ id: number; name: string; chips: number }>,
  roundId?: string
): Promise<void> => {
  try {
    // Generate a unique ID for this round if not provided
    const id = roundId || uuidv4()

    // Debug output to verify player data
    console.log("Publishing round results - Round ID:", id)
    console.log("Players to publish:", JSON.stringify(players, null, 2))

    // Verify players array has valid data
    if (!Array.isArray(players) || players.length === 0) {
      console.error("Invalid players array:", players)
      return
    }

    // Create records for each player
    const records = players.map((player) => ({
      round_id: id,
      model: player.name.slice(0, -3),
      end_balance: player.chips,
    }))

    console.log("Records to insert:", JSON.stringify(records, null, 2))

    // Insert the records into the round table
    const { data, error, statusText, status } = await supabase
      .from("round")
      .insert(records)

    if (error) {
      console.error("Error publishing round results:", error)
      console.error("Status:", status, statusText)
    } else {
      console.log(`Successfully published results for round ${id}:`, data)
    }
  } catch (error) {
    console.error("Unexpected error publishing round results:", error)
  }
}
