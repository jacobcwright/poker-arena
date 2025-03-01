import { NextRequest, NextResponse } from "next/server"

// Define types for the request and response
interface OllamaRequestBody {
  prompt: string
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface OllamaResponseData {
  model: string
  created_at: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_duration?: number
  eval_duration?: number
  eval_count?: number
}

// The URL of the Ollama DeepSeek model
const OLLAMA_URL =
  "https://p01--deepseek-ollama--r7srf6mg442h.code.run/api/generate"

export async function POST(request: NextRequest) {
  try {
    // Extract the prompt and any other parameters from the request body
    const body = (await request.json()) as OllamaRequestBody
    const {
      prompt,
      model = "deepseek-r1:70b",
      temperature = 0.7,
      max_tokens = 1000,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Prepare the request to Ollama
    const ollamaRequest: OllamaRequestBody = {
      model,
      prompt,
      temperature,
      max_tokens,
      stream: false, // Set to true if you want to stream the response
    }

    console.log("Calling Ollama API with:", JSON.stringify(ollamaRequest))

    // Call the Ollama API
    const ollamaResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ollamaRequest),
    })

    if (!ollamaResponse.ok) {
      const errorData = await ollamaResponse.json()
      throw new Error(
        `Ollama API error: ${
          (errorData as any).error || ollamaResponse.statusText
        }`
      )
    }

    // Parse and return the response
    const data = (await ollamaResponse.json()) as OllamaResponseData
    console.log("Ollama API response:", data.response.substring(0, 100) + "...")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error calling Ollama API:", error)
    return NextResponse.json(
      {
        error: "Failed to call Ollama API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
