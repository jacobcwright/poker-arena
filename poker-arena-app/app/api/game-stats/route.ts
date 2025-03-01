import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Initialize Supabase client
const supabaseUrl = "https://lfcwyepxzewahcqfoxrx.supabase.co"; //process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmY3d5ZXB4emV3YWhjcWZveHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MjczNTgsImV4cCI6MjA1NjQwMzM1OH0.BA33QYo7htgSeZEiPWDVdAjXOGL8fg0te_HYPcwrxG0"; //process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Query to get game data with model names by joining the tables
    const { data, error } = await supabase
      .from("game")
      .select(
        `
        winner,
        profit,
        model:winner (
          name
        )
      `
      )
      .order("profit", { ascending: false });

    if (error) {
      console.error("Error fetching data:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process the data to get max profit per winner with model name
    const winnerProfits = new Map();

    if (data) {
      data.forEach((game: any) => {
        const { winner, profit } = game;
        // Handle the model data safely, considering it might be an array or object
        let modelName = "Unknown Model";

        if (game.model) {
          // If model is an array with at least one item
          if (Array.isArray(game.model) && game.model.length > 0) {
            modelName = game.model[0].name || "Unknown Model";
          }
          // If model is a direct object
          else if (typeof game.model === "object" && game.model.name) {
            modelName = game.model.name;
          }
        }

        if (
          !winnerProfits.has(winner) ||
          profit > winnerProfits.get(winner).profit
        ) {
          winnerProfits.set(winner, {
            profit,
            modelName,
          });
        }
      });
    }

    // Convert to array format for the frontend
    const result = Array.from(winnerProfits.entries()).map(
      ([winner_id, data]) => ({
        winner_id,
        profit: data.profit,
        modelName: data.modelName,
      })
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
