"use client"
import { useEffect, useState, useRef } from "react"
import { GameState, Player, PlayerAction, Emotion, GameStats } from "./types"
import PokerTable from "./components/PokerTable"
import { createInitialGameState, gameLoop } from "./game/gameEngine"
import { assignPersonalities, determineAction } from "./game/pokerAI"
import ActivityLog from "./components/ActivityLog"
import Card from "./components/Card"

// Define interface for AI decision to ensure type consistency
interface AIDecision {
  action: PlayerAction
  betAmount?: number
  chainOfThought?: string
  emotion?: Emotion
  reasoningSummary?: string
}

// Add global styles for animations
const globalStyles = `
  @keyframes fade-in-out {
    0% { opacity: 0; transform: translateY(10px) scale(0.8); }
    15% { opacity: 1; transform: translateY(0) scale(1); }
    75% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-15px) scale(0.8); }
  }

  @keyframes rise-fade {
    0% { opacity: 0; transform: translate(-50%, 10px); }
    20% { opacity: 1; transform: translate(-50%, 0); }
    80% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -20px); }
  }

  @keyframes winner-pulse {
    0% { opacity: 0.4; }
    50% { opacity: 0.6; }
    100% { opacity: 0.4; }
  }

  .confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: #ffcc00;
    border-radius: 50%;
    opacity: 0.8;
    animation: confetti-fall 3s linear infinite;
  }

  .confetti-0 { background-color: #FFD700; }
  .confetti-1 { background-color: #FF8C00; }
  .confetti-2 { background-color: #FF4500; }
  .confetti-3 { background-color: #7CFC00; }
  .confetti-4 { background-color: #00BFFF; }

  @keyframes confetti-fall {
    0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(150px) rotate(360deg); opacity: 0; }
  }

  .winner-trophy {
    animation: bounce 0.5s ease infinite alternate;
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-5px); }
  }

  .winner-banner {
    animation: shimmer 1.5s linear infinite;
    background-size: 200% 100%;
    background-image: linear-gradient(to right, #f59e0b 0%, #fbbf24 25%, #f59e0b 50%, #fbbf24 75%, #f59e0b 100%);
  }

  @keyframes shimmer {
    0% { background-position: 0% 0; }
    100% { background-position: 200% 0; }
  }

  /* Mobile responsive styles */
  @media (max-width: 640px) {
    .poker-table-container {
      display: none !important;
    }

    .mobile-pot-display {
      display: block !important;
    }

    .mobile-players-container {
      display: block !important;
    }
    
    .player-card-mobile {
      margin-bottom: 0.5rem;
      width: 100%;
    }
    
    .desktop-only {
      display: none !important;
    }
    
    .mobile-only {
      display: block !important;
    }
  }
`

export default function Home() {
  const [playerCount, setPlayerCount] = useState(6)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gamePhaseDelay, setGamePhaseDelay] = useState(2000) // milliseconds
  const roundRef = useRef(0)
  const [gameStats, setGameStats] = useState<GameStats>(createInitialStats())
  const [isPaused, setIsPaused] = useState(false)
  const pauseResumeRef = useRef<{ resolve: (() => void) | null }>({
    resolve: null,
  })
  const isPausedRef = useRef(false)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [playerTypes, setPlayerTypes] = useState<Record<number, string>>({}) // Track player types
  const [lastWinAmount, setLastWinAmount] = useState<number>(0) // Store the last winning amount

  // Define model config type
  type ModelConfig = {
    name: string
    apiEndpoint?: string
    model?: string
    temperature?: number
    max_tokens?: number
    special_prompt?: string
  }

  // Configuration for different AI models
  const modelConfigs: Record<string, ModelConfig> = {
    AI: {
      // Regular AI doesn't need API configuration
      name: "Monte-Carlo",
    },
    "DeepSeek-R1:70b": {
      name: "DeepSeek-R1:70b",
      apiEndpoint: "/api/deepseek",
      model: "deepseek-r1:70b",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt: "",
    },
    "DeepSeek-R1:70b-Bluff": {
      name: "DeepSeek-R1:70b-Bluff",
      apiEndpoint: "/api/deepseek",
      model: "deepseek-r1:70b",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
    "Claude-3.7-Thinking": {
      name: "Claude-3.7-Thinking",
      apiEndpoint: "/api/claude-thinking",
      model: "claude-3-7-sonnet-20250219",
      temperature: 1,
      max_tokens: 10000,
      special_prompt: "",
    },
    "Claude-3.7-Thinking-Bluff": {
      name: "Claude-3.7-Thinking-Bluff",
      apiEndpoint: "/api/claude-thinking",
      model: "claude-3-7-sonnet-20250219",
      temperature: 1,
      max_tokens: 10000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
    "Claude-3.7": {
      name: "Claude-3.7",
      apiEndpoint: "/api/claude",
      model: "claude-3-7-sonnet-20250219",
      temperature: 1,
      max_tokens: 10000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
    "Llama-3.1-8b": {
      name: "Llama-3.1-8b",
      apiEndpoint: "/api/ollama",
      model: "llama3.1:8b",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt: "",
    },
    "Llama-3.1-8b-Bluff": {
      name: "Llama-3.1-8b-Bluff",
      apiEndpoint: "/api/ollama",
      model: "llama3.1:8b",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
    "Phi-4-14b": {
      name: "Phi-4-14b",
      apiEndpoint: "/api/ollama",
      model: "phi4:14b",
      temperature: 0.7,
      max_tokens: 3000,
    },
    "Phi-4-14b-Bluff": {
      name: "Phi-4-14b-Bluff",
      apiEndpoint: "/api/ollama",
      model: "phi4:14b",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
    "Qwen-2.5-3b": {
      name: "Qwen-2.5-3b",
      apiEndpoint: "/api/ollama",
      model: "qwen2.5:3b",
      temperature: 0.7,
      max_tokens: 3000,
    },
    "Qwen-2.5-3b-Bluff": {
      name: "Qwen-2.5-3b-Bluff",
      apiEndpoint: "/api/ollama",
      model: "qwen2.5:3b",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
    "Qwen-2.5-3b-Thinking": {
      name: "Qwen-2.5-3b-Thinking",
      apiEndpoint: "/api/ollama",
      model: "custom-qwen",
      temperature: 0.7,
      max_tokens: 3000,
      special_prompt:
        "Try to make the best decision based on the information provided. You can and should bluff to throw off your opponents & win the pot.",
    },
  }

  // Initialize game state when player count changes
  useEffect(() => {
    const initialState = createInitialGameState(playerCount)
    setGameState(initialState)

    // Initialize player types with default "AI"
    const initialPlayerTypes: Record<number, string> = {}
    const playerTypeOptions = [
      "Claude-3.7-Thinking-Bluff",
      "Claude-3.7-Thinking",
      "Claude-3.7",
      "Phi-4-14b-Bluff",
      "DeepSeek-R1:70b-Bluff",
      "AI",
    ]

    initialState.players.forEach((player, index) => {
      // Cycle through player types based on index
      const playerType = playerTypeOptions[index % playerTypeOptions.length]
      initialPlayerTypes[player.id] = playerType

      // Set initial player name based on model type
      player.name = `${modelConfigs[playerType].name} #${player.id + 1}`
    })
    setPlayerTypes(initialPlayerTypes)
  }, [playerCount])

  const handlePlayerTypeChange = (playerId: number, type: string) => {
    setPlayerTypes((prev) => {
      const newTypes = {
        ...prev,
        [playerId]: type,
      }

      // Update the player name when changing the model type
      if (gameState) {
        const player = gameState.players.find((p) => p.id === playerId)
        if (player) {
          player.name = `${modelConfigs[type].name} #${playerId + 1}`
          // Create a new reference to cause a re-render
          setGameState({ ...gameState })
        }
      }

      return newTypes
    })
  }

  // Add this function to handle regular AI decisions
  const getRegularAIDecision = (
    player: Player,
    gameState: GameState
  ): AIDecision => {
    // Use the existing AI logic from your game engine
    const decision = determineAction(gameState, player.id)

    // Add an appropriate emotion based on the decision
    let emotion: Emotion = "neutral"
    switch (decision.action) {
      case "fold":
        emotion = "disappointed"
        break
      case "check":
        emotion = "neutral"
        break
      case "call":
        emotion = "thoughtful"
        break
      case "bet":
      case "raise":
        emotion = Math.random() > 0.5 ? "confident" : "bluffing"
        break
      case "allIn":
        emotion = Math.random() > 0.7 ? "excited" : "nervous"
        break
    }

    // Add a simple reasoning summary based on the action
    const reasoningSummary = ""

    return {
      ...decision,
      emotion,
      reasoningSummary,
      chainOfThought: reasoningSummary, // Use the summary as chainOfThought too for consistency
    }
  }

  /**
   * Get the decision from the LLM.
   */
  const getPlayerDecision = async (
    player: Player,
    gameState: GameState
  ): Promise<AIDecision> => {
    const playerType = playerTypes[player.id]

    // Regular AI decision
    if (playerType === "AI" || !modelConfigs[playerType]) {
      return getRegularAIDecision(player, gameState)
    }

    // Advanced AI model decision
    const config = modelConfigs[playerType]

    // If config doesn't have required API settings, use regular AI
    if (!config.apiEndpoint || !config.model) {
      return getRegularAIDecision(player, gameState)
    }

    try {
      const response = await fetch(config.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: generatePokerPrompt(player, gameState, config),
          model: config.model,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.max_tokens ?? 3000,
        }),
      })

      console.log(`${playerType} response:`, response)

      if (!response.ok) {
        throw new Error(`Failed to get ${playerType} decision`)
      }

      const data = await response.json()

      // Handle the structured response from API routes
      if (data.response) {
        const decision = parseDecisionFromLlama(data.response)

        // Return decision with additional fields from the API
        return {
          ...decision,
          emotion: data.emotion || decision.emotion || "neutral",
          chainOfThought: data.reasoning || decision.chainOfThought || "",
          reasoningSummary: data.reasoning_summary || "",
        }
      } else {
        // Fallback to parsing the raw response
        return parseDecisionFromLlama(data.text || "")
      }
    } catch (error) {
      console.error(`Error getting ${playerType} decision:`, error)
      // Fallback to regular AI if the model API fails
      return getRegularAIDecision(player, gameState)
    }
  }

  // Helper functions for Llama integration
  const generatePokerPrompt = (
    player: Player,
    gameState: GameState,
    config: ModelConfig
  ) => {
    const prompt = `You are playing poker. 
    Your cards: ${
      player.hand?.map((c) => `${c.rank}${c.suit}`).join(", ") || ""
    }
    Community cards: ${
      gameState.communityCards?.map((c) => `${c.rank}${c.suit}`).join(", ") ||
      "None yet"
    }
    Current pot: $${gameState.pot}
    Your chips: $${player.chips}
    Your current bet: $${player.currentBet}
    Opponent's Chips: $${
      gameState.players
        .filter((p) => p.id !== player.id)
        .map((p) => p.chips)
        .join(", ") || 0
    }

    Opponent's Emotions: ${
      gameState.players
        .filter((p) => p.id !== player.id)
        .map((p) => p.emotion)
        .join(", ") || "None"
    }

    Current bet to call: $${
      Math.max(...gameState.players.map((p) => p.currentBet)) -
      player.currentBet
    }

    Stage: ${gameState.currentPhase}

    Previous actions: ${
      gameState.activityLog
        ? gameState.activityLog
            .slice(-5)
            .map(
              (entry) =>
                `${entry.playerName}: ${entry.action} ${
                  entry.amount ? "$" + entry.amount : ""
                }`
            )
            .join(", ")
        : "None"
    }

    ${config.special_prompt}

    What action would you take? Choose one:
    fold
    check
    call
    bet (with amount)
    raise (with amount)
    allin
    `
    console.log("prompt", prompt)
    return prompt
  }

  const parseDecisionFromLlama = (response: string): AIDecision => {
    // Check if there's a thinking section, and only parse after it
    const lowerResponse = response.toLowerCase()
    const thinkIndex = lowerResponse.indexOf("</think>")

    const chainOfThought =
      thinkIndex !== -1 ? response.substring(7, thinkIndex) : ""

    // Use only the text after </think> if it exists, otherwise use the whole response
    const decisionText =
      thinkIndex !== -1
        ? lowerResponse.substring(thinkIndex + 9) // Length of </think> is 9
        : lowerResponse

    // Extract emotion from the response
    let emotion: Emotion = "neutral"
    const emotionMatch = response.match(/EMOTION:\s*(\w+(-\w+)?)/i)
    if (emotionMatch && emotionMatch[1]) {
      const extractedEmotion = emotionMatch[1].toLowerCase() as Emotion
      const validEmotions: Emotion[] = [
        "neutral",
        "happy",
        "excited",
        "nervous",
        "thoughtful",
        "suspicious",
        "confident",
        "disappointed",
        "frustrated",
        "surprised",
        "poker-face",
        "bluffing",
        "calculating",
        "intimidating",
        "worried",
      ]

      if (validEmotions.includes(extractedEmotion)) {
        emotion = extractedEmotion
      }
    }

    if (decisionText.includes("fold"))
      return {
        action: "fold" as PlayerAction,
        chainOfThought,
        emotion,
        reasoningSummary: "Folding due to a weak hand.",
      }
    if (decisionText.includes("check"))
      return {
        action: "check" as PlayerAction,
        chainOfThought,
        emotion,
        reasoningSummary: "Checking to see the next card.",
      }
    if (decisionText.includes("call"))
      return {
        action: "call" as PlayerAction,
        chainOfThought,
        emotion,
        reasoningSummary: "Calling to stay in the hand.",
      }

    // Try to extract raise amount
    if (decisionText.includes("raise") || decisionText.includes("bet")) {
      const match = decisionText.match(/(raise|bet).*?(\d+)/)
      const betAmount = match ? parseInt(match[2]) : 20 // Default raise
      return {
        action: "raise" as PlayerAction,
        betAmount,
        chainOfThought,
        emotion,
        reasoningSummary: `Raising ${betAmount} to build the pot.`,
      }
    }

    if (
      decisionText.includes("allin") ||
      decisionText.includes("all in") ||
      decisionText.includes("all-in")
    ) {
      return {
        action: "allIn" as PlayerAction,
        chainOfThought,
        emotion,
        reasoningSummary: "Going all-in for maximum value.",
      }
    }

    // Default to call if parsing fails
    return {
      action: "call" as PlayerAction,
      chainOfThought,
      emotion,
      reasoningSummary: "Calling to see what happens next.",
    }
  }

  // Update the ref when the state changes
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // Update the existing useEffect for gameLoop with the following code:
  useEffect(() => {
    if (!isGameRunning) return

    let isMounted = true

    // A helper to stop the loop if the component unmounts or game stops
    const shouldStop = () => !isMounted || !isGameRunning

    // Wrap the getPlayerDecision to capture win amounts
    const wrappedGetPlayerDecision = async (
      player: Player,
      gameState: GameState
    ): Promise<AIDecision> => {
      // Save the winning amount when it's determined
      if (
        gameState.currentPhase === "showdown" &&
        gameState.winningPlayers &&
        gameState.winningPlayers.length > 0
      ) {
        const winAmount = Math.floor(
          gameState.pot / gameState.winningPlayers.length
        )
        setLastWinAmount(winAmount)
      }

      // Get the decision from the appropriate AI model
      const decision = await getPlayerDecision(player, gameState)

      // Ensure that all fields are properly passed through
      return {
        action: decision.action,
        betAmount: decision.betAmount,
        chainOfThought: decision.chainOfThought,
        emotion: decision.emotion,
        reasoningSummary: decision.reasoningSummary,
      }
    }

    // Start the game loop using the new gameLoop function from gameEngine
    ;(async () => {
      // Use the current gameState if available, otherwise initialize one
      const initialState = gameState || {
        ...createInitialGameState(playerCount),
        round: 1,
      }
      // If it's the first round, assign AI personalities
      if (initialState.round === 1) {
        assignPersonalities(initialState.players)
      }
      // Run the continuous game loop; it will handle rounds without resetting chip counts
      console.log("initialState", initialState)
      await gameLoop(
        initialState,
        setGameState,
        gamePhaseDelay,
        wrappedGetPlayerDecision,
        shouldStop
      )
    })()

    return () => {
      isMounted = false
    }
  }, [isGameRunning, playerCount, gamePhaseDelay])

  // Toggle game on/off
  const toggleGame = () => {
    if (!isGameRunning) {
      // Create a fresh game state and reset round counter
      roundRef.current = 1
      const newGameState = {
        ...createInitialGameState(playerCount),
        round: roundRef.current,
      }

      // Update player names based on their assigned model types
      newGameState.players.forEach((player) => {
        const modelType = playerTypes[player.id] || "AI"
        player.name = `${modelConfigs[modelType].name} #${player.id + 1}`
      })

      setGameState(newGameState)
      setIsGameRunning(true)
    } else {
      setIsGameRunning(false)
    }
  }

  // Toggle pause state
  const togglePause = () => {
    setIsPaused((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Add the global styles */}
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      <main className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Poker Arena</h1>
          <p className="text-gray-400">
            Watch AI Agents compete in Texas Hold'em
          </p>
        </header>

        {/* Game Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          {gameState && !isGameRunning && (
            <div className="mt-6 border-t border-gray-700 pt-4 mb-8">
              <h3 className="text-lg font-semibold mb-3">Player Types</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {gameState.players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-3 rounded ${
                      player.chips <= 0
                        ? "bg-red-900 bg-opacity-30 border border-red-700"
                        : "bg-gray-700"
                    }`}
                  >
                    <div className="font-medium mb-2 flex items-center justify-between">
                      <span>{player.name}</span>
                      <span className="text-sm">${player.chips}</span>
                      {player.chips <= 0 && (
                        <span className="text-xs text-red-400 font-bold">
                          BANKRUPT
                        </span>
                      )}
                    </div>
                    <select
                      className={`rounded px-3 py-1 w-full ${
                        player.chips <= 0
                          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                          : "bg-gray-600"
                      }`}
                      value={playerTypes[player.id] || "AI"}
                      onChange={(e) =>
                        handlePlayerTypeChange(player.id, e.target.value)
                      }
                      disabled={isGameRunning || player.chips <= 0}
                    >
                      {Object.keys(modelConfigs).map((modelKey) => (
                        <option key={modelKey} value={modelKey}>
                          {modelConfigs[modelKey].name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 justify-center">
            <div className="flex items-center gap-4">
              <label htmlFor="playerCount">Players:</label>
              <select
                id="playerCount"
                className="bg-gray-700 rounded px-3 py-2"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                disabled={isGameRunning}
              >
                {[2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            {/* <div className="flex items-center gap-4">
              <label htmlFor="gameSpeed">Speed:</label>
              <select
                id="gameSpeed"
                className="bg-gray-700 rounded px-3 py-2"
                value={gamePhaseDelay}
                onChange={(e) => setGamePhaseDelay(Number(e.target.value))}
              >
                <option value={1000}>Fast</option>
                <option value={2000}>Normal</option>
                <option value={3000}>Slow</option>
              </select>
            </div> */}

            <button
              onClick={toggleGame}
              className={`px-6 py-2 rounded-md font-semibold ${
                isGameRunning
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isGameRunning ? "Stop Game" : "Start Game"}
            </button>

            {isGameRunning && (
              <button
                onClick={togglePause}
                disabled={!isGameRunning}
                className={`px-6 py-2 rounded-md font-semibold ${
                  !isGameRunning
                    ? "bg-gray-600 cursor-not-allowed"
                    : isPaused
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {isPaused ? "Resume Game" : "Pause Game"}
              </button>
            )}
          </div>

          {/* Activity Log toggle */}
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setIsLogOpen(!isLogOpen)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm flex items-center gap-2"
            >
              <span>{isLogOpen ? "Hide" : "Show"} Activity Log</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>

          {/* Hint for card hover feature */}
          <div className="text-center mt-3 text-gray-400 text-sm desktop-only">
            <span className="bg-gray-700 px-2 py-1 rounded inline-block">
              💡 Tip: Hover over any player to see their cards
            </span>
          </div>
        </div>

        {/* Mobile Pot Display - Only visible on mobile */}
        {gameState && (
          <div className="mobile-pot-display hidden md:hidden p-2 bg-gray-800 rounded-lg mb-2">
            <div className="flex items-center justify-between px-3">
              <div className="bg-green-900 bg-opacity-80 px-3 py-1.5 rounded-full text-white text-base font-bold shadow inline-flex items-center">
                <span className="text-yellow-400 mr-1">$</span>
                {gameState.pot}
              </div>

              <div className="text-right">
                <p className="text-gray-400 text-sm mb-1">
                  Phase: {gameState.currentPhase}
                </p>
                <div className="flex justify-end gap-1">
                  {gameState.communityCards.length > 0 ? (
                    gameState.communityCards.map((card, index) => (
                      <div
                        key={index}
                        className="transform card-shadow"
                        style={{ width: "30px" }}
                      >
                        <Card key={index} card={card} />
                      </div>
                    ))
                  ) : (
                    <div className="text-white text-xs font-light opacity-80">
                      {gameState.currentPhase === "idle"
                        ? "Ready"
                        : "Waiting..."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Players Display - Only visible on mobile */}
        {gameState && (
          <div className="mobile-players-container hidden md:hidden mb-4">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`player-card-mobile p-3 rounded-lg mb-2 ${
                  player.isTurn
                    ? "bg-gray-700 border-l-4 border-green-500"
                    : player.chips <= 0
                    ? "bg-gray-700 border-l-4 border-red-600"
                    : "bg-gray-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        player.isDealer ? "bg-blue-600" : "bg-gray-800"
                      }`}
                    >
                      {player.isDealer ? "D" : player.id + 1}
                    </div>
                    <span className="font-medium text-sm">{player.name}</span>
                  </div>
                  <span className="text-base font-bold">${player.chips}</span>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div>
                    {player.currentBet > 0 && (
                      <div className="text-yellow-400 text-xs">
                        Current bet: ${player.currentBet}
                      </div>
                    )}

                    {player.isAllIn && (
                      <div className="mt-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full inline-block">
                        ALL IN
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-1">
                    {player.hand && player.hand.length > 0 ? (
                      player.hand.map((card, idx) => (
                        <div
                          key={idx}
                          className="transform"
                          style={{ width: "40px" }}
                        >
                          <Card
                            key={idx}
                            card={card}
                            hidden={false}
                            faceUp={true}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-xs">No cards</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Poker Table - Hidden on mobile */}
        <div className="py-20 poker-table-container">
          {gameState ? (
            <PokerTable gameState={gameState} />
          ) : (
            <div className="aspect-[16/9] relative overflow-visible mb-16 mt-8 pt-12">
              {/* Wooden table base - darker bottom layer for depth */}
              <div className="absolute inset-1 rounded-[50%] bg-gray-950 shadow-2xl"></div>

              {/* Outer table frame - mahogany rail with improved grain texture */}
              <div
                className="absolute inset-0 rounded-[50%] shadow-2xl"
                style={{
                  backgroundImage: `
                    linear-gradient(to bottom, rgba(85, 33, 33, 0.95), rgba(52, 17, 17, 0.95)),
                    url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")
                  `,
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.1)",
                }}
              >
                {/* Decorative inlay on the wooden rail */}
                <div className="absolute inset-2 rounded-[50%] border-[1px] border-rose-900 opacity-20"></div>
                <div className="absolute inset-3 rounded-[50%] border-[1px] border-gray-300 opacity-10"></div>
              </div>

              {/* Inner felt table with enhanced texture and subtle gradient */}
              <div
                className="absolute inset-4 rounded-[50%] bg-green-800 shadow-inner felt-texture"
                style={{
                  boxShadow:
                    "inset 0 0 40px rgba(0,0,0,0.5), inset 0 0 80px rgba(0,0,0,0.2)",
                }}
              >
                {/* Center spotlight effect */}
                <div
                  className="absolute inset-0 rounded-[50%] opacity-20"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 60%)",
                  }}
                ></div>

                {/* Community Cards skeleton and pot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="flex flex-col items-center">
                    {/* Card skeletons */}
                    <div className="flex gap-3 mb-6">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-16 h-24 bg-gray-600 rounded-md animate-pulse opacity-40"
                        >
                          <div className="w-full h-full bg-gray-800 rounded-md opacity-50"></div>
                        </div>
                      ))}
                    </div>

                    {/* Pot skeleton */}
                    <div className="bg-green-900 bg-opacity-50 backdrop-blur-sm px-6 py-3 rounded-full animate-pulse">
                      <div className="w-24 h-6 bg-gray-600 opacity-40 rounded-md"></div>
                    </div>

                    {/* Loading text */}
                    <div className="mt-4 text-white text-center text-xl font-light tracking-wider opacity-80">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Loading game</span>
                        <span
                          className="animate-bounce"
                          style={{ animationDelay: "0s" }}
                        >
                          .
                        </span>
                        <span
                          className="animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        >
                          .
                        </span>
                        <span
                          className="animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        >
                          .
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player skeletons */}
                {[...Array(6)].map((_, i) => {
                  // Position players around the table, mimicking the actual layout
                  const sixPlayerPositions = [0, 1, 3, 4, 5, 7] // Skip positions 2 and 6 for better spacing
                  const positionIndex = sixPlayerPositions[i]
                  const angle = positionIndex * 45 * (Math.PI / 180)

                  // Adjust this radius to position players correctly on the table edge
                  const radius = 40
                  const x = 50 + radius * Math.cos(angle)
                  const y = 50 + radius * Math.sin(angle)

                  return (
                    <div
                      key={i}
                      className="absolute w-32 h-24 transform -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{
                        top: `${y}%`,
                        left: `${x}%`,
                      }}
                    >
                      <div className="bg-gray-800 bg-opacity-60 p-2 rounded-lg animate-pulse border border-gray-700">
                        {/* Avatar skeleton */}
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-700 mr-2"></div>
                          <div className="w-16 h-4 bg-gray-700 rounded"></div>
                        </div>

                        {/* Cards skeleton */}
                        <div className="flex justify-center gap-1 mt-2">
                          <div className="w-8 h-12 bg-gray-700 rounded-sm"></div>
                          <div className="w-8 h-12 bg-gray-700 rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Game Stats and Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Current Round Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Current Round</h2>
            <p className="text-gray-400">
              {gameState
                ? `Phase: ${gameState.currentPhase}`
                : "Game not started"}
            </p>
            {gameState && (
              <>
                <p className="text-gray-400">Pot: ${gameState.pot}</p>
                <p className="text-gray-400">Round: {roundRef.current}</p>
              </>
            )}
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Player Chips</h3>
              <div className="text-gray-400">
                {gameState?.players.map((player) => (
                  <div key={player.id} className="mb-1 flex items-center">
                    <span
                      className={
                        player.chips <= 0 ? "line-through text-red-400" : ""
                      }
                    >
                      {player.name}: ${player.chips}
                    </span>
                    {player.isDealer && (
                      <span className="ml-2 bg-blue-600 text-xs px-1 rounded">
                        Dealer
                      </span>
                    )}
                    {player.isTurn && (
                      <span className="ml-2 bg-green-600 text-xs px-1 rounded">
                        Active
                      </span>
                    )}
                    {player.chips <= 0 && (
                      <span className="ml-2 bg-red-700 text-xs px-1 rounded animate-pulse">
                        BANKRUPT
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hand Winner Card - Fixed nesting and display */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Hand Winner</h2>
            {gameState &&
            gameState.winningPlayers &&
            gameState.winningPlayers.length > 0 ? (
              <div className="text-center">
                <div className="mb-3">
                  <span className="font-semibold text-2xl text-yellow-400">
                    🏆
                  </span>
                  <h3 className="text-lg font-bold text-yellow-400">
                    {gameState.winningPlayers
                      .map((playerId) => {
                        const player = gameState.players.find(
                          (p) => p.id === playerId
                        )
                        return player ? player.name : ""
                      })
                      .filter(Boolean)
                      .join(", ")}
                  </h3>
                </div>
                <p className="text-gray-400">
                  Winning amount: $
                  {lastWinAmount > 0
                    ? lastWinAmount
                    : gameState.activityLog && gameState.activityLog.length > 0
                    ? (() => {
                        // Find the most recent win entries for the winning players
                        const winEntries = gameState.activityLog
                          .filter(
                            (entry) =>
                              entry.action === "win" &&
                              gameState.winningPlayers?.includes(entry.playerId)
                          )
                          .sort((a, b) => b.timestamp - a.timestamp)

                        if (winEntries.length > 0) {
                          return winEntries[0].amount || 0
                        }
                        return 0
                      })()
                    : 0}
                </p>
                {gameState.handResults && gameState.winningPlayers[0] && (
                  <p className="text-gray-400 mt-2">
                    Hand:{" "}
                    <span className="text-yellow-400">
                      {gameState.handResults[gameState.winningPlayers[0]]}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 italic">No winner yet</p>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <ActivityLog
          gameState={gameState}
          isOpen={isLogOpen}
          onToggle={() => setIsLogOpen(!isLogOpen)}
        />
      </main>
    </div>
  )
}

// Create an initial stats object
const createInitialStats = (): GameStats => {
  return {
    handsPlayed: 0,
    biggestPot: 0,
    biggestWin: {},
    handWins: {},
  }
}
