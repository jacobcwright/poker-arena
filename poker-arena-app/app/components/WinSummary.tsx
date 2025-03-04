import { useState, useEffect, useRef } from "react"
import { GameState } from "../types"
import { motion, AnimatePresence } from "framer-motion"

interface WinSummaryProps {
  gameState: GameState | null
  isOpen: boolean
  onToggle: () => void
}

const WinSummary: React.FC<WinSummaryProps> = ({
  gameState,
  isOpen,
  onToggle,
}) => {
  // Reference to the container for auto-scrolling
  const summaryContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when new content is displayed
  useEffect(() => {
    if (
      summaryContainerRef.current &&
      isOpen &&
      gameState?.winningPlayers &&
      gameState.winningPlayers.length > 0
    ) {
      summaryContainerRef.current.scrollTop = 0
    }
  }, [gameState?.winningPlayers, isOpen])

  // Get color based on hand type
  const getHandTypeColor = (handDescription: string): string => {
    if (handDescription.includes("Royal Flush"))
      return "text-purple-300 font-bold"
    if (handDescription.includes("Straight Flush"))
      return "text-purple-400 font-bold"
    if (handDescription.includes("Four of a Kind"))
      return "text-indigo-400 font-bold"
    if (handDescription.includes("Full House")) return "text-blue-400 font-bold"
    if (handDescription.includes("Flush")) return "text-cyan-400 font-bold"
    if (handDescription.includes("Straight")) return "text-teal-400 font-bold"
    if (handDescription.includes("Three of a Kind"))
      return "text-green-400 font-bold"
    if (handDescription.includes("Two Pair")) return "text-yellow-400 font-bold"
    if (handDescription.includes("Pair")) return "text-orange-400 font-bold"
    return "text-red-400 font-bold" // High Card
  }

  return (
    <div
      className={`win-summary-container fixed left-0 top-0 h-full z-10 transition-all duration-300 ${
        isOpen ? "w-96" : "w-2"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-gray-800 text-white p-2 rounded-r-md hover:bg-gray-700 hover:p-4 transition-all duration-200 text-sm hover:text-2xl md:block hidden"
      >
        {isOpen ? "←" : "→"}
      </button>

      {/* Mobile toggle button - only visible on small screens */}
      <button
        onClick={onToggle}
        className="absolute right-0 top-0 translate-x-full bg-gray-800 text-white p-2 rounded-br-md hover:bg-gray-700 transition-colors text-lg md:hidden block z-20"
      >
        {isOpen ? "←" : "→"}
      </button>

      <div className="h-full bg-gray-900 bg-opacity-95 border-r border-gray-700 flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
          <h3 className="text-white font-semibold">
            {isOpen ? "Win Summary" : ""}
          </h3>
          {isOpen && (
            <div className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded animate-pulse">
              New
            </div>
          )}
        </div>

        {/* Summary content */}
        {isOpen && (
          <div
            ref={summaryContainerRef}
            className="flex-1 overflow-y-auto p-4 text-white"
          >
            {gameState &&
            gameState.winningPlayers &&
            gameState.winningPlayers.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="mb-3 text-center">
                    <span className="font-semibold text-4xl text-yellow-400">
                      🏆
                    </span>
                    <h3 className="text-xl font-bold text-yellow-400 mt-2">
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

                  {/* Winning amount */}
                  <div className="mt-4 text-center">
                    <p className="text-gray-400">
                      Won:
                      <span className="text-green-400 font-bold ml-2">
                        $
                        {(() => {
                          if (
                            gameState.activityLog &&
                            gameState.activityLog.length > 0
                          ) {
                            // Find the most recent win entries for the winning players
                            const winEntries = gameState.activityLog
                              .filter(
                                (entry) =>
                                  entry.action === "win" &&
                                  gameState.winningPlayers?.includes(
                                    entry.playerId
                                  )
                              )
                              .sort((a, b) => b.timestamp - a.timestamp)

                            if (winEntries.length > 0) {
                              return winEntries[0].amount || 0
                            }
                          }
                          return 0
                        })()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Hand description */}
                {gameState.handResults &&
                  gameState.winningPlayers.map((playerId) => (
                    <div
                      key={playerId}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <h4 className="text-lg font-medium mb-2">Winning Hand</h4>
                      <p
                        className={getHandTypeColor(
                          gameState.handResults?.[playerId] || ""
                        )}
                      >
                        {gameState.handResults?.[playerId]}
                      </p>

                      {/* Reasoning about why this hand won */}
                      <div className="mt-4">
                        <h4 className="text-lg font-medium mb-2">
                          Why This Hand Won
                        </h4>
                        <div className="text-gray-300 text-sm space-y-2">
                          {gameState.handResults?.[playerId]?.includes(
                            "Royal Flush"
                          ) ? (
                            <p>
                              A Royal Flush is the highest possible hand in
                              poker, with A-K-Q-J-10 of the same suit.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Straight Flush"
                            ) ? (
                            <p>
                              A Straight Flush contains five cards of the same
                              suit in sequence, the second-highest hand in
                              poker.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Four of a Kind"
                            ) ? (
                            <p>
                              Four of a Kind contains all four cards of the same
                              rank, a very powerful hand.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Full House"
                            ) ? (
                            <p>
                              A Full House contains three cards of one rank and
                              two of another, beating flushes and straights.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Flush"
                            ) ? (
                            <p>
                              A Flush contains five cards of the same suit (not
                              in sequence), beating straights and lower hands.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Straight"
                            ) ? (
                            <p>
                              A Straight contains five cards in sequence,
                              regardless of suit, beating three of a kind and
                              lower hands.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Three of a Kind"
                            ) ? (
                            <p>
                              Three of a Kind contains three cards of the same
                              rank, beating two pair and lower hands.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Two Pair"
                            ) ? (
                            <p>
                              Two Pair contains two different pairs, beating a
                              single pair and high card hands.
                            </p>
                          ) : gameState.handResults?.[playerId]?.includes(
                              "Pair"
                            ) ? (
                            <p>
                              A Pair contains two cards of the same rank,
                              beating only high card hands.
                            </p>
                          ) : (
                            <p>
                              The highest card played decided the winner when no
                              player had a better hand.
                            </p>
                          )}
                          <p>
                            In case of tied hand types, the hand with the
                            highest-ranking cards wins.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Player comparison if multiple players were active */}
                {gameState.players.filter((p) => p.isActive).length > 1 && (
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-lg font-medium mb-2">
                      Hand Comparison
                    </h4>
                    <p className="text-gray-300 text-sm">
                      The winning hand beat all other active players at showdown
                      with a superior poker hand ranking.
                    </p>

                    {/* In a future enhancement, we could add a detailed comparison of all hands */}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 italic mt-10">
                No winner yet
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WinSummary
