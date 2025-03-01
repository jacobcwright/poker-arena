import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Emotion } from "../../types"
import OpenAI from "openai"

// Define types for the request and response
interface ClaudeRequestBody {
  prompt: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface ClaudeResponseBody {
  response: string
  emotion?: Emotion
  chainOfThought?: string
  reasoning_summary?: string
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
      temperature = 0.7,
      max_tokens = 2000,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Modify the prompt to include a special thinking format with emotion
    const enhancedPrompt = `${prompt}

You are a poker player who needs to make a decision. First, analyze the situation in detail by thinking step-by-step.
Begin your response with <think> followed by your detailed analysis.
End your thinking with </think>.

After your analysis, state your final decision clearly and concisely.
Also, tell me what emotion you're displaying to other players by adding "EMOTION: [emotion]" at the end of your response.
Choose from: neutral, happy, excited, nervous, thoughtful, suspicious, confident, disappointed, frustrated, surprised, poker-face, bluffing, calculating, intimidating, worried.

For example:
<think>
[Your detailed analysis here...]
</think>

I will call.

EMOTION: poker-face
`

    // Initialize the Anthropic client
    const anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    })

    console.log("Calling Claude API with:", {
      model,
      enhancedPrompt,
      temperature,
      max_tokens,
    })

    // Call the Claude API using the SDK
    const message = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      messages: [{ role: "user", content: enhancedPrompt }],
    })

    let responseText = ""
    let thinkingText = ""
    // Parse the response content
    if (message.content && message.content.length > 0) {
      // Check for content blocks and extract text
      for (const block of message.content) {
        if (block.type === "text" && "text" in block) {
          responseText = String(block.text || "")
        }
        if (block.type === "thinking" && "text" in block) {
          thinkingText = String(block.text || "")
        }
      }
    }

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
        <thinking>
        ${thinkingText}
        </thinking>
        ${responseText}
        `,
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

    const response: ClaudeResponseBody = {
      response: jsonResponse.decision,
      emotion: jsonResponse.emotion,
      chainOfThought: jsonResponse.chainOfThought,
      reasoning_summary: jsonResponse.reasoning_summary,
    }

    console.log("========== Claude API thinking response:", response)

    return NextResponse.json(response)
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
