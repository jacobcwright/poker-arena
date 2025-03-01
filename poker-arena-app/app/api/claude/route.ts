import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

// Define types for the request and response
interface ClaudeRequestBody {
  prompt: string
  model?: string
  temperature?: number
  max_tokens?: number
}

// Replace this with your actual Claude API key
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ""

export async function POST(request: NextRequest) {
  try {
    // Extract the prompt and any other parameters from the request body
    const body = (await request.json()) as ClaudeRequestBody
    const {
      prompt,
      model = "claude-3-7-sonnet-20250219",
      temperature = 1,
      max_tokens = 10000,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Initialize the Anthropic client
    const anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    })

    console.log("Calling Claude API with:", {
      model,
      prompt,
      temperature,
      max_tokens,
    })

    // Call the Claude API using the SDK
    const message = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      thinking: {
        type: "enabled",
        budget_tokens: 2000,
      },
      messages: [{ role: "user", content: prompt }],
    })

    console.log("Claude API response:", message)
    console.log("Claude API content:", message.content)

    // Extract chain of thought and response text safely
    let chainOfThought = ""
    let responseText = ""

    // Parse the response content
    if (message.content && message.content.length > 0) {
      // Check for content blocks and extract text
      for (const block of message.content) {
        if (block.type === "thinking" && "thinking" in block) {
          // ThinkingBlock has a 'thinking' property, not 'text'
          chainOfThought = String(block.thinking || "")
        } else if (block.type === "text" && "text" in block) {
          responseText = String(block.text || "")
        }
      }
    }

    return NextResponse.json({
      model: message.model,
      response: "<think>" + chainOfThought + "</think>\n" + responseText,
      chainOfThought,
      done: true,
    })
  } catch (error) {
    console.error("Error calling Claude API:", error)
    return NextResponse.json(
      {
        error: "Failed to call Claude API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
