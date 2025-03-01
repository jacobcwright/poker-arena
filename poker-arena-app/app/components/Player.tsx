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
  const [animateAvatar, setAnimateAvatar] = useState(false)

  // Function to get emoji for a card suit
  const getCardSuitSymbol = (suit: string): string => {
    const suitSymbols: Record<string, string> = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    }
    return suitSymbols[suit] || ""
  }

  // Periodically animate active players' avatars for a "breathing" effect
  useEffect(() => {
    if (isTurn) {
      const interval = setInterval(() => {
        setAnimateAvatar(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isTurn]);

  // Show action animation when action changes
  useEffect(() => {
    if (action) {
      setCurrentAction(action)
      setShowAction(true)

      const timer = setTimeout(() => {
        setShowAction(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [action])

  // Positioning classes based on position
  const positions = [
    "-bottom-16 left-1/2 -translate-x-1/2", // 0: Bottom center
    "bottom-16 right-24", // 1: Bottom right
    "-right-16 top-1/2 -translate-y-1/2", // 2: Right center
    "top-16 right-24", // 3: Top right
    "-top-16 left-1/2 -translate-x-1/2", // 4: Top center
    "top-16 left-24", // 5: Top left
    "-left-16 top-1/2 -translate-y-1/2", // 6: Left center
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

  // Generate avatar color based on player name
  const getAvatarColor = () => {
    const colors = [
      'bg-blue-600',
      'bg-red-600',
      'bg-green-600',
      'bg-purple-600',
      'bg-yellow-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-teal-600',
    ];
    
    // Simple hash function to get consistent color
    const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[nameHash % colors.length];
  }

  // Action text and styles with enhanced animations
  const getActionDisplay = () => {
    if (!currentAction) return null

    let text = ""
    let bgColor = "bg-blue-500"
    let icon = ""

    switch (currentAction.type) {
      case "fold":
        text = "FOLD"
        bgColor = "bg-gradient-to-r from-red-700 to-red-500"
        icon = "🚫"
        break
      case "check":
        text = "CHECK"
        bgColor = "bg-gradient-to-r from-blue-700 to-blue-500"
        icon = "✓"
        break
      case "call":
        text = "CALL"
        bgColor = "bg-gradient-to-r from-green-700 to-green-500"
        icon = "👍"
        break
      case "bet":
        text = `BET $${currentAction.amount}`
        bgColor = "bg-gradient-to-r from-yellow-600 to-yellow-400"
        icon = "💰"
        break
      case "raise":
        text = `RAISE $${currentAction.amount}`
        bgColor = "bg-gradient-to-r from-amber-700 to-amber-500"
        icon = "⬆️"
        break
      case "allIn":
        text = "ALL IN!"
        bgColor = "bg-gradient-to-r from-red-900 to-red-600"
        icon = "🔥"
        break
    }

    return (
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 ${bgColor} px-4 py-2 rounded-lg 
                      text-white font-bold shadow-xl animate-rise-fade z-20 flex items-center`}
        style={{
          animation: 'rise-fade 2s forwards',
          boxShadow: '0 6px 12px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.2)'
        }}
      >
        <span className="mr-1.5">{icon}</span>
        {text}
      </div>
    )
  }

  // Calculate spotlight opacity based on player state
  const getSpotlightOpacity = () => {
    if (isWinner) return 0.3;
    if (isTurn) return 0.2;
    return 0;
  }

  return (
    <div
      className={`absolute ${positionClass} ${isTurn ? "z-20" : "z-10"} 
                transition-all duration-500`}
    >
      {/* Player spotlight for active player */}
      {(isTurn || isWinner) && (
        <div 
          className={`absolute -inset-4 rounded-full transition-opacity duration-700 ${
            isWinner ? "bg-gradient-radial from-yellow-400/30 to-transparent" : "bg-gradient-radial from-blue-400/20 to-transparent"
          }`}
          style={{
            opacity: getSpotlightOpacity(),
            animation: isWinner ? 'pulse 2s infinite' : ''
          }}
        ></div>
      )}

      <div
        className={`bg-gray-800 rounded-lg p-4 backdrop-blur-sm border-2 
                  ${
                    isWinner
                      ? "border-yellow-400 bg-gray-800/90"
                      : isTurn
                      ? "border-blue-400 bg-gray-800/95"
                      : isHovered
                      ? "border-green-400 bg-gray-800/95"
                      : chips <= 0
                      ? "border-red-700 bg-gray-900/80 opacity-70"
                      : "border-gray-700 bg-gray-800/80"
                  }
                  ${
                    !showCards && hand
                      ? "cursor-pointer hover:shadow-lg hover:shadow-green-900/50"
                      : ""
                  }
                  shadow-md hover:shadow-lg
                  transition-all duration-300 ${
                    isHovered ? "transform scale-105" : ""
                  } ${
                    isTurn ? `transform ${animateAvatar ? 'scale-110' : 'scale-105'} transition-transform duration-1000` : ""
                  }`}
        style={{
          boxShadow: isWinner 
            ? '0 0 15px rgba(250, 204, 21, 0.5)' 
            : isTurn 
              ? '0 0 12px rgba(96, 165, 250, 0.4)' 
              : '0 4px 6px rgba(0, 0, 0, 0.2)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showAction && getActionDisplay()}

        <div className="flex flex-col items-center">
          {/* Cards container with improved layout */}
          <div className="flex gap-1.5 mb-3 relative group">
            {hand ? (
              <>
                <div className="transform group-hover:rotate-[-5deg] group-hover:translate-x-[-2px] transition-all duration-300">
                  <Card
                    card={{
                      ...hand[0],
                      // Force cards to be face-up when hovered or during showdown
                      faceUp: isHovered || showCards || isActive,
                    }}
                    hidden={false}
                  />
                </div>
                <div className="transform group-hover:rotate-[5deg] group-hover:translate-x-[2px] transition-all duration-300">
                  <Card
                    card={{
                      ...hand[1],
                      // Force cards to be face-up when hovered or during showdown
                      faceUp: isHovered || showCards || isActive,
                    }}
                    hidden={false}
                  />
                </div>
                
                {/* Improved card tooltip on hover */}
                {isHovered && !showCards && !isActive && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs py-2 px-4 rounded-md whitespace-nowrap font-medium shadow-xl backdrop-blur-sm border border-gray-700 z-50">
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
              <div className="text-gray-400 px-4 py-2">No cards</div>
            )}
          </div>

          {/* Player info section with enhanced layout */}
          <div className="flex items-center gap-2 mb-1.5">
            {/* Avatar circle with first letter of name */}
            <div className={`${getAvatarColor()} w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ${isDealer ? 'ring-2 ring-white' : ''}`}>
              {name.charAt(0).toUpperCase()}
            </div>
            
            <div className={`font-bold text-lg ${chips <= 0 ? "text-red-500" : isWinner ? "text-yellow-300" : "text-white"}`}>
              {name}
            </div>
            
            {/* Status indicators */}
            <div className="flex gap-1">
              {isDealer && (
                <div className="bg-white text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                  D
                </div>
              )}
              {chips <= 0 && (
                <div className="bg-red-700 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                  OUT
                </div>
              )}
            </div>
          </div>

          {/* Add an overlay "X" for bankrupt players */}
          {chips <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-red-600 text-6xl font-bold opacity-40">
                ✖
              </div>
            </div>
          )}

          {/* Better chips and status display */}
          <div className="flex flex-wrap justify-center gap-2 text-sm mt-1">
            <div
              className={`px-2 py-1 rounded-full ${
                chips <= 0 
                  ? "bg-red-900/50 text-red-500 line-through" 
                  : "bg-green-900/50 text-green-300"
              } font-mono`}
            >
              ${chips}
            </div>
            {currentBet > 0 && (
              <div className="bg-yellow-900/50 px-2 py-1 rounded-full text-yellow-300 font-mono">
                Bet: ${currentBet}
              </div>
            )}
            {isAllIn && (
              <div className="bg-red-900/50 px-2 py-1 rounded-full text-red-300 font-bold animate-pulse">
                ALL IN
              </div>
            )}
            {!isActive && chips > 0 && (
              <div className="bg-gray-900/50 px-2 py-1 rounded-full text-gray-300">
                FOLDED
              </div>
            )}
          </div>

          {/* Enhanced equity display with better visual representation */}
          {equity !== undefined && isActive && hand && (
            <div className="mt-2 w-full px-1">
              <div className="text-xs text-gray-400 mb-0.5 flex justify-between">
                <span>Equity</span>
                <span className={getEquityColor()}>{equity.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getEquityColor()}`}
                  style={{ width: `${Math.min(100, equity)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Enhanced winner badge */}
          {isWinner && (
            <div className="mt-2.5 bg-gradient-to-r from-yellow-600 to-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-md animate-pulse">
              WINNER! 🏆
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
