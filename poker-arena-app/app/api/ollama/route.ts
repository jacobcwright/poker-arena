export const maxDuration = 20
import { NextRequest, NextResponse } from "next/server"
import { Emotion } from "../../types"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

// Define types for the request and response
interface OllamaRequestBody {
  prompt: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface OllamaResponseBody {
  response: string
  emotion?: Emotion
  chainOfThought?: string
  reasoning_summary?: string
}

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ""

export async function POST(request: NextRequest) {
  try {
    // Extract the prompt and any other parameters from the request body
    const body = (await request.json()) as OllamaRequestBody
    const {
      prompt,
      model = "deepseek",
      temperature = 0.7,
      max_tokens = 2000,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Modify the prompt to include a format for emotion
    const enhancedPrompt = `${prompt}

After your analysis, state your final decision clearly and concisely.
Also, tell me what emotion you're displaying to other players by adding "EMOTION: [emotion]" at the end of your response.
Choose from: neutral, happy, excited, nervous, thoughtful, suspicious, confident, disappointed, frustrated, surprised, poker-face, bluffing, calculating, intimidating, worried.

For example:
I will call.

EMOTION: poker-face
`

    // Set up parameters for Ollama API
    const ollamaParams = {
      model: model,
      prompt: enhancedPrompt,
      stream: false,
      options: {
        temperature: temperature,
        num_predict: max_tokens,
      },
    }

    console.log("Calling Ollama API with:", ollamaParams)

    // Call the Ollama API
    // Replace with your actual Ollama endpoint
    const ollamaEndpoint =
      "https://p01--deepseek-ollama--r7srf6mg442h.code.run/api/generate"
    const ollamaResponse = await fetch(ollamaEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ollamaParams),
    })

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API returned ${ollamaResponse.status}`)
    }

    const data = await ollamaResponse.json()
    console.log("Ollama API response:", data)

    const responseText = data.response || ""

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const output = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      max_tokens,
      temperature,
      messages: [
        {
          role: "user",
          content: `Analyze the following text and extract the following information: 
        - The emotion of the text
        - The reasoning behind the emotion
        - The final decision

        Respond in JSON format as follows:
        {
          "emotion": "emotion",
          "reasoning": "reasoning",
          "reasoning_summary": "reasoning_summary",
          "decision": "decision"
        }

        Here is the text to analyze:
        ${responseText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "emotion_decision_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              decision: {
                type: "string",
                description:
                  "The decision made based on the emotion and reasoning.",
              },
              chainOfThought: {
                type: "string",
                description:
                  "The reasoning behind the the decision. Do not summarize the reasoning, just provide the reasoning.",
              },
              reasoning_summary: {
                type: "string",
                description:
                  "A summary of the reasoning for better comprehension.",
              },
              emotion: {
                type: "string",
                description: "The emotion displayed by the player.",
              },
            },
            required: [
              "emotion",
              "chainOfThought",
              "reasoning_summary",
              "decision",
            ],
            additionalProperties: false,
          },
        },
      },
    })

    const jsonResponse = JSON.parse(output.choices[0].message.content || "")

    console.log("========== JSON response:", jsonResponse)

    const response: OllamaResponseBody = {
      response: jsonResponse.decision,
      emotion: jsonResponse.emotion,
      chainOfThought: jsonResponse.chainOfThought,
      reasoning_summary: jsonResponse.reasoning_summary,
    }

    console.log("========== Ollama API response:", response)

    return NextResponse.json(response)
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
