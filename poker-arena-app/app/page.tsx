"use client"
import { useEffect, useState, useRef } from "react"
import { GameState, GameStats, Player } from "./types"
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
} from "./game/gameEngine"
import { assignPersonalities } from "./game/pokerAI"
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

  // Initialize game state when player count changes
  useEffect(() => {
    setGameState(createInitialGameState(playerCount))
  }, [playerCount])

  // Update the ref when the state changes
  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // Refactor the game loop to better handle pausing
  useEffect(() => {
    if (!isGameRunning) return

    let isMounted = true

    const waitWithPauseCheck = async (ms: number) => {
      // Wait for the specified time
      await new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
      })

      // Check for pause after the timer
      while (isPausedRef.current && isMounted) {
        // Wait in small increments while paused
        await new Promise((r) => setTimeout(r, 100))
      }
    }

    const gameLoop = async () => {
      if (!isMounted) return

      // Start with a fresh game state for this round
      const freshState = {
        ...createInitialGameState(playerCount),
        round: roundRef.current,
      }

      // Assign AI personalities to players
      assignPersonalities(freshState.players)

      // Initialize with blinds
      const initializedState = initializeBlinds(freshState)
      if (!isMounted) return
      setGameState(initializedState)
      await waitWithPauseCheck(1000)

      // Deal player cards
      const dealingState = dealPlayerCards(initializedState)
      if (!isMounted) return
      setGameState(dealingState)
      await waitWithPauseCheck(gamePhaseDelay)

      // Pre-flop betting round
      let currentState = await processBettingRound(
        dealingState,
        setGameState,
        gamePhaseDelay / 2
      )
      if (!isMounted) return

      // Deal flop (3 cards)
      const flopState = dealFlop(currentState)
      if (!isMounted) return
      setGameState(flopState)
      await waitWithPauseCheck(gamePhaseDelay)

      // Flop betting round
      currentState = await processBettingRound(
        flopState,
        setGameState,
        gamePhaseDelay / 2
      )
      if (!isMounted) return

      // Deal turn (1 card)
      const turnState = dealTurn(currentState)
      if (!isMounted) return
      setGameState(turnState)
      await waitWithPauseCheck(gamePhaseDelay)

      // Turn betting round
      currentState = await processBettingRound(
        turnState,
        setGameState,
        gamePhaseDelay / 2
      )
      if (!isMounted) return

      // Deal river (1 card)
      const riverState = dealRiver(currentState)
      if (!isMounted) return
      setGameState(riverState)
      await waitWithPauseCheck(gamePhaseDelay)

      // River betting round
      currentState = await processBettingRound(
        riverState,
        setGameState,
        gamePhaseDelay / 2
      )
      if (!isMounted) return

      // Showdown phase
      const showdownState = { ...currentState, currentPhase: "showdown" }

      // Calculate final equity before determining winners
      const stateWithEquity = calculateEquity(showdownState as GameState)
      setGameState(stateWithEquity)
      await waitWithPauseCheck(500) // Short delay to show final equity

      // Determine winners with hand descriptions
      const { winners, handDescriptions } = determineWinners(stateWithEquity)

      // Make sure we're correctly handling the hand descriptions
      console.log("Hand descriptions:", handDescriptions) // Add logging to debug

      // Update state with winners and hand results
      const finalState = {
        ...awardPot(stateWithEquity, winners),
        winningPlayers: winners.map((w) => w.id),
        handResults: handDescriptions,
      }

      if (!isMounted) return
      setGameState(finalState as GameState)
      // Increase showdown delay to give more time to see results
      await waitWithPauseCheck(gamePhaseDelay * 3) // Increased from 2x to 3x

      // Update statistics
      updateStats(finalState, winners)

      // If still running, trigger the next round
      if (isMounted && isGameRunning) {
        roundRef.current += 1
        // Set up the next hand for the next round
        setGameState((prevState) => {
          if (!prevState) return setupNextHand(finalState as GameState)
          return setupNextHand(prevState)
        })

        // Use setTimeout to break the synchronous execution chain
        setTimeout(() => {
          if (isMounted && isGameRunning) {
            gameLoop()
          }
        }, 0)
      }
    }

    gameLoop()

    return () => {
      isMounted = false
    }
  }, [isGameRunning, playerCount, gamePhaseDelay])

  // Toggle game on/off
  const toggleGame = () => {
    if (!isGameRunning) {
      // Create a fresh game state and reset round counter
      roundRef.current = 1
      setGameState({
        ...createInitialGameState(playerCount),
        round: roundRef.current,
      })
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
            Watch Claude NPCs compete in Texas Hold'em
          </p>
        </header>

        {/* Game Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
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
              className={`px-6 py-2 rounded-full font-semibold ${
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
                className={`px-6 py-2 rounded-full font-semibold ${
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
        {gameState ? (
          <PokerTable gameState={gameState} />
        ) : (
          <div className="aspect-[16/9] bg-green-800 rounded-[50%] relative border-8 border-brown-800 mb-8">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-xl font-semibold mb-2">Loading game...</p>
            </div>
          </div>
        )}

        {/* Game Stats and Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-8">
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
                  <div key={player.id} className="mb-1">
                    {player.name}: ${player.chips}
                    {player.isDealer && " (Dealer)"}
                    {player.isTurn && " (Active)"}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Statistics Panel */}
          {gameState && (
            <StatsPanel
              stats={gameStats}
              playerNames={Object.fromEntries(
                gameState.players.map((p) => [p.id, p.name])
              )}
            />
          )}
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
