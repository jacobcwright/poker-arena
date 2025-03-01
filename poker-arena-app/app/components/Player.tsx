import { useEffect, useState } from "react"
import { Player as PlayerType, PlayerAction } from "../types"
import Card from "./Card"

interface PlayerProps {
  player: PlayerType
  position: number
  showCards?: boolean
  action?: { type: PlayerAction; amount?: number }
  isWinner?: boolean
}

export default function Player({
  player,
  position,
  showCards = false,
  action,
  isWinner = false,
}: PlayerProps) {
  const {
    name,
    hand,
    chips,
    currentBet,
    isActive,
    isDealer,
    isTurn,
    isAllIn,
    equity,
  } = player

  const [showAction, setShowAction] = useState(false)
  const [currentAction, setCurrentAction] = useState<{
    type: PlayerAction
    amount?: number
  } | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Function to get emoji for a card suit
  const getCardSuitSymbol = (suit: string): string => {
    const suitSymbols: Record<string, string> = {
      hearts: "♥️",
      diamonds: "♦️",
      clubs: "♣️",
      spades: "♠️",
    }
    return suitSymbols[suit] || ""
  }

  // Show action animation when action changes
  useEffect(() => {
    if (action) {
      setCurrentAction(action)
      setShowAction(true)

      const timer = setTimeout(() => {
        setShowAction(false)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [action])

  // Positioning classes based on position
  const positions = [
    "bottom-8 left-1/2 -translate-x-1/2", // 0: Bottom center
    "bottom-16 right-24", // 1: Bottom right
    "right-8 top-1/2 -translate-y-1/2", // 2: Right center
    "top-16 right-24", // 3: Top right
    "top-8 left-1/2 -translate-x-1/2", // 4: Top center
    "top-16 left-24", // 5: Top left
    "left-8 top-1/2 -translate-y-1/2", // 6: Left center
    "bottom-16 left-24", // 7: Bottom left
  ]

  const positionClass = positions[position % positions.length]

  // Get color based on equity value
  const getEquityColor = () => {
    if (equity === undefined || !isActive || !hand) return "text-gray-500"
    if (equity >= 75) return "text-green-500"
    if (equity >= 50) return "text-lime-400"
    if (equity >= 30) return "text-yellow-400"
    if (equity >= 15) return "text-orange-400"
    return "text-red-400"
  }

  // Action text and styles
  const getActionDisplay = () => {
    if (!currentAction) return null

    let text = ""
    let bgColor = "bg-blue-500"

    switch (currentAction.type) {
      case "fold":
        text = "FOLD"
        bgColor = "bg-red-600"
        break
      case "check":
        text = "CHECK"
        bgColor = "bg-blue-500"
        break
      case "call":
        text = "CALL"
        bgColor = "bg-green-500"
        break
      case "bet":
        text = `BET $${currentAction.amount}`
        bgColor = "bg-yellow-500"
        break
      case "raise":
        text = `RAISE $${currentAction.amount}`
        bgColor = "bg-yellow-600"
        break
      case "allIn":
        text = "ALL IN!"
        bgColor = "bg-red-700"
        break
    }

    return (
      <div
        className={`absolute -top-10 left-1/2 -translate-x-1/2 ${bgColor} px-3 py-1 rounded-full 
                      text-white font-bold animate-bounce shadow-lg`}
      >
        {text}
      </div>
    )
  }

  return (
    <div
      className={`absolute ${positionClass} ${isTurn ? "scale-110" : ""} 
                transition-all duration-300`}
    >
      <div
        className={`bg-gray-800 rounded-lg p-3 border-2 
                  ${
                    isWinner
                      ? "border-yellow-400 bg-gray-700"
                      : isTurn
                      ? "border-blue-400"
                      : isHovered
                      ? "border-green-400 bg-gray-700"
                      : chips <= 0
                      ? "border-red-700 bg-gray-900 opacity-70"
                      : "border-gray-700"
                  }
                  ${
                    !showCards && hand
                      ? "cursor-pointer hover:shadow-lg hover:shadow-green-900/50"
                      : ""
                  }
                  transition-all duration-200 ${
                    isHovered ? "transform scale-105" : ""
                  }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showAction && getActionDisplay()}

        <div className="flex flex-col items-center">
          <div className="flex gap-1 mb-2 relative">
            {hand ? (
              <>
                <Card
                  card={{
                    ...hand[0],
                    // Force cards to be face-up when hovered or during showdown
                    faceUp: isHovered || showCards || isActive,
                  }}
                  hidden={false}
                />
                <Card
                  card={{
                    ...hand[1],
                    // Force cards to be face-up when hovered or during showdown
                    faceUp: isHovered || showCards || isActive,
                  }}
                  hidden={false}
                />
                {isHovered && !showCards && !isActive && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs py-1 px-3 rounded whitespace-nowrap font-medium">
                    <span
                      className={
                        hand[0].suit === "hearts" || hand[0].suit === "diamonds"
                          ? "text-red-400"
                          : "text-white"
                      }
                    >
                      {hand[0].rank}
                      {getCardSuitSymbol(hand[0].suit)}
                    </span>{" "}
                    <span
                      className={
                        hand[1].suit === "hearts" || hand[1].suit === "diamonds"
                          ? "text-red-400"
                          : "text-white"
                      }
                    >
                      {hand[1].rank}
                      {getCardSuitSymbol(hand[1].suit)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-400">No cards</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDealer && (
              <div className="bg-white text-black text-xs px-2 py-1 rounded-full">
                D
              </div>
            )}
            <div className={`font-bold ${chips <= 0 ? "text-red-500" : ""}`}>
              {name}
            </div>
            {chips <= 0 && (
              <div className="bg-red-700 text-white text-xs px-1 rounded">
                OUT
              </div>
            )}
          </div>

          {/* Add an overlay "X" for bankrupt players */}
          {chips <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-red-600 text-6xl font-bold opacity-40">
                ✖
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-sm mt-1">
            <div
              className={`${
                chips <= 0 ? "text-red-500 line-through" : "text-green-400"
              }`}
            >
              ${chips}
            </div>
            {currentBet > 0 && (
              <div className="text-yellow-400">Bet: ${currentBet}</div>
            )}
            {isAllIn && <div className="text-red-400">ALL IN</div>}
            {!isActive && <div className="text-gray-400">FOLDED</div>}
            {chips <= 0 && (
              <div className="text-red-500 font-bold animate-pulse">
                BANKRUPT
              </div>
            )}
          </div>

          {/* Display equity odds */}
          {equity !== undefined && isActive && hand && (
            <div className={`mt-1 ${getEquityColor()} text-sm font-bold`}>
              Equity: {equity.toFixed(1)}%
            </div>
          )}

          {isWinner && (
            <div className="mt-2 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              WINNER
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
