"use client"
import { useEffect, useState, useRef } from "react"
import { GameState, GameStats, Player, PlayerAction } from "./types"
import PokerTable from "./components/PokerTable"
import {
  createInitialGameState,
  dealFlop,
  dealPlayerCards,
  dealRiver,
  dealTurn,
  processBettingRound,
  initializeBlinds,
  determineWinners,
  awardPot,
  setupNextHand,
  addLogEntry,
  gameLoop,
} from "./game/gameEngine"
import { assignPersonalities, determineAction } from "./game/pokerAI"
import { calculateEquity } from "./game/equityCalculator"
import StatsPanel from "./components/StatsPanel"
import ActivityLog from "./components/ActivityLog"

export default function Home() {
  const [playerCount, setPlayerCount] = useState(4)
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
  }

  // Configuration for different AI models
  const modelConfigs: Record<string, ModelConfig> = {
    AI: {
      // Regular AI doesn't need API configuration
      name: "Regular AI",
    },
    "DeepSeek-R1:70b": {
      name: "DeepSeek-R1:70b",
      apiEndpoint: "/api/ollama",
      model: "deepseek-r1:70b",
      temperature: 0.7,
      max_tokens: 3000,
    },
    "Claude-3.7": {
      name: "Claude-3.7",
      apiEndpoint: "/api/claude",
      model: "claude-3-7-sonnet-20250219",
      temperature: 1,
      max_tokens: 10000,
    },
  }

  // Initialize game state when player count changes
  useEffect(() => {
    const initialState = createInitialGameState(playerCount)
    setGameState(initialState)

    // Initialize player types with default "AI"
    const initialPlayerTypes: Record<number, string> = {}
    initialState.players.forEach((player) => {
      initialPlayerTypes[player.id] = "AI"
      // Set initial player name based on model type
      player.name = `${modelConfigs["AI"].name} #${player.id + 1}`
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
  const getRegularAIDecision = (player: Player, gameState: GameState) => {
    // Use the existing AI logic from your game engine
    return determineAction(gameState, player.id)
  }

  /**
   * Get the decision from the LLM.
   */
  const getPlayerDecision = async (player: Player, gameState: GameState) => {
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
          prompt: generatePokerPrompt(player, gameState),
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
      return parseDecisionFromLlama(data.response)
    } catch (error) {
      console.error(`Error getting ${playerType} decision:`, error)
      // Fallback to regular AI if the model API fails
      return getRegularAIDecision(player, gameState)
    }
  }

  // Helper functions for Llama integration
  const generatePokerPrompt = (player: Player, gameState: GameState) => {
    return `You are playing poker. 
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

    Current bet to call: $${
      (gameState.players.find((p) => p.id === player.id)?.currentBet || 0) -
      (player.currentBet || 0)
    }

    Stage: ${gameState.currentPhase}

    Previous actions: ${JSON.stringify(gameState.playerActions)}

    Your output should only be the action you would take.
    
    What action would you take? Choose one:
    fold
    check
    call
    bet (with amount)
    allin
    `
  }

  const parseDecisionFromLlama = (response: string) => {
    // Check if there's a thinking section, and only parse after it
    const lowerResponse = response.toLowerCase()
    const thinkIndex = lowerResponse.indexOf("</think>")

    const chainOfThought = response.substring(8, thinkIndex)

    // Use only the text after </think> if it exists, otherwise use the whole response
    const decisionText =
      thinkIndex !== -1
        ? lowerResponse.substring(thinkIndex + 9) // Length of </think> is 9
        : lowerResponse

    if (decisionText.includes("fold"))
      return { action: "fold" as PlayerAction, chainOfThought }
    if (decisionText.includes("check"))
      return { action: "check" as PlayerAction, chainOfThought }
    if (decisionText.includes("call"))
      return { action: "call" as PlayerAction, chainOfThought }

    // Try to extract raise amount
    if (decisionText.includes("raise") || decisionText.includes("bet")) {
      const match = decisionText.match(/(raise|bet).*?(\d+)/)
      const betAmount = match ? parseInt(match[2]) : 20 // Default raise
      return { action: "raise" as PlayerAction, betAmount, chainOfThought }
    }

    if (decisionText.includes("allin")) {
      return { action: "allIn" as PlayerAction, chainOfThought }
    }

    // Default to call if parsing fails
    return { action: "call" as PlayerAction, chainOfThought }
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
    ) => {
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

      return getPlayerDecision(player, gameState)
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

  // Update statistics when a round ends
  const updateStats = (state: GameState, winners: Player[]) => {
    setGameStats((prevStats: GameStats) => {
      const newStats = { ...prevStats }

      // Increment hands played
      newStats.handsPlayed += 1

      // Update biggest pot if current pot is larger
      if (state.pot > newStats.biggestPot) {
        newStats.biggestPot = state.pot
      }

      // Track winners
      const winAmount = Math.floor(state.pot / winners.length)

      winners.forEach((winner) => {
        // Update hand wins counter
        newStats.handWins[winner.id] = (newStats.handWins[winner.id] || 0) + 1

        // Update biggest win amount for this player
        if (
          !newStats.biggestWin[winner.id] ||
          winAmount > newStats.biggestWin[winner.id]
        ) {
          newStats.biggestWin[winner.id] = winAmount
        }
      })

      return newStats
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
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
              <div className="grid grid-cols-3 gap-4">
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
          <div className="flex items-center gap-8 justify-center">
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

            <div className="flex items-center gap-4">
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
            </div>

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
          <div className="text-center mt-3 text-gray-400 text-sm">
            <span className="bg-gray-700 px-2 py-1 rounded inline-block">
              💡 Tip: Hover over any player to see their cards
            </span>
          </div>
        </div>

        {/* Poker Table */}
        <div className="py-20">
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
