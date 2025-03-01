"use client"
import { useEffect, useState, useRef } from "react"
import { GameState } from "./types"
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

export default function Home() {
  const [playerCount, setPlayerCount] = useState(4)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gamePhaseDelay, setGamePhaseDelay] = useState(2000) // milliseconds
  const roundRef = useRef(0)

  // Initialize game state when player count changes
  useEffect(() => {
    setGameState(createInitialGameState(playerCount))
  }, [playerCount])

  // Game loop
  useEffect(() => {
    if (!isGameRunning || !gameState) return

    let isMounted = true

    const gameLoop = async () => {
      if (!isMounted) return

      // Start with a fresh game state for this round
      const freshState = {
        ...createInitialGameState(playerCount),
        round: roundRef.current,
      }

      // Assign AI personalities to players
      assignPersonalities(freshState.players)

      if (isMounted) {
        // Initialize with blinds
        const initializedState = initializeBlinds(freshState)
        setGameState(initializedState)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Deal player cards
        const dealingState = dealPlayerCards(initializedState)
        setGameState(dealingState)
        await new Promise((resolve) => setTimeout(resolve, gamePhaseDelay))

        if (!isMounted) return

        // Pre-flop betting round
        let currentState = await processBettingRound(
          dealingState,
          setGameState,
          gamePhaseDelay / 2
        )

        if (!isMounted) return

        // Deal flop (3 cards)
        const flopState = dealFlop(currentState)
        setGameState(flopState)
        await new Promise((resolve) => setTimeout(resolve, gamePhaseDelay))

        if (!isMounted) return

        // Flop betting round
        currentState = await processBettingRound(
          flopState,
          setGameState,
          gamePhaseDelay / 2
        )

        if (!isMounted) return

        // Deal turn (1 card)
        const turnState = dealTurn(currentState)
        setGameState(turnState)
        await new Promise((resolve) => setTimeout(resolve, gamePhaseDelay))

        if (!isMounted) return

        // Turn betting round
        currentState = await processBettingRound(
          turnState,
          setGameState,
          gamePhaseDelay / 2
        )

        if (!isMounted) return

        // Deal river (1 card)
        const riverState = dealRiver(currentState)
        setGameState(riverState)
        await new Promise((resolve) => setTimeout(resolve, gamePhaseDelay))

        if (!isMounted) return

        // River betting round
        currentState = await processBettingRound(
          riverState,
          setGameState,
          gamePhaseDelay / 2
        )

        if (!isMounted) return

        // Showdown phase
        const showdownState = { ...currentState, currentPhase: "showdown" }

        // Determine winners
        const { winners, handDescriptions } = determineWinners(
          showdownState as GameState
        )

        // Update state with winners
        const finalState = {
          ...awardPot(showdownState as GameState, winners),
          winningPlayers: winners.map((w) => w.id),
          handResults: handDescriptions,
        }

        setGameState(finalState as GameState)
        await new Promise((resolve) => setTimeout(resolve, gamePhaseDelay * 2))

        // If still running, trigger the next round
        if (isMounted && isGameRunning) {
          roundRef.current += 1
          // Set up the next hand
          setGameState(setupNextHand(finalState as GameState))
          gameLoop()
        }
      }
    }

    gameLoop()

    // Cleanup function to handle unmounting
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

        {/* Game Stats */}
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
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Player Stats</h2>
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
      </main>
    </div>
  )
}
