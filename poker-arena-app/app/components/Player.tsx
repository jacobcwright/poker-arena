import { useEffect, useState } from "react"
import { Player as PlayerType, PlayerAction, Emotion } from "../types"
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
    emotion = "neutral",
  } = player

  const [showAction, setShowAction] = useState(false)
  const [currentAction, setCurrentAction] = useState<{
    type: PlayerAction
    amount?: number
  } | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [animateAvatar, setAnimateAvatar] = useState(false)
  const [showEmotionAnimation, setShowEmotionAnimation] = useState(false)
  const [previousIsTurn, setPreviousIsTurn] = useState(isTurn)

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

  // Extract player's nickname and personality
  const getNicknameAndPersonality = (): {
    nickname: string
    personality: string
  } => {
    // Default values
    let nickname = name
    let personality = "regular"

    return { nickname, personality }
  }

  // Personality-driven styling
  const getPersonalityIcon = (): string => {
    const { personality } = getNicknameAndPersonality()

    switch (personality) {
      case "aggressive":
        return "🔥"
      case "tight":
        return "🔒"
      case "analytical":
        return "🧮"
      case "loose":
        return "🎲"
      case "conservative":
        return "🧊"
      case "bluffer":
        return "🃏"
      case "passive":
        return "☯️"
      case "unpredictable":
        return "❓"
      case "balanced":
        return "⚖️"
      case "risk-taker":
        return "💰"
      case "cautious":
        return "🐢"
      default:
        return "🤖"
    }
  }

  // Function to get emotion emoji
  const getEmotionEmoji = (): string => {
    switch (emotion) {
      case "happy":
        return "😊"
      case "excited":
        return "😃"
      case "nervous":
        return "😰"
      case "thoughtful":
        return "🤔"
      case "suspicious":
        return "🤨"
      case "confident":
        return "😎"
      case "disappointed":
        return "😞"
      case "frustrated":
        return "😤"
      case "surprised":
        return "😲"
      case "poker-face":
        return "😐"
      case "bluffing":
        return "😏"
      case "calculating":
        return "🧐"
      case "intimidating":
        return "😠"
      case "worried":
        return "😟"
      case "neutral":
        return "😐"
      default:
        return "😶"
    }
  }

  // Function to get tooltip text for emotion
  const getEmotionTooltip = (): string => {
    const emotionWord = emotion.charAt(0).toUpperCase() + emotion.slice(1)
    return `${emotionWord}`
  }

  // Track turn changes to trigger the emotion animation
  useEffect(() => {
    // If player was active but is no longer active (turn just ended)
    if (previousIsTurn && !isTurn) {
      setShowEmotionAnimation(true)

      // Hide the animation after some time
      const timer = setTimeout(() => {
        setShowEmotionAnimation(false)
      }, 3000) // 3 seconds total for animation

      return () => clearTimeout(timer)
    }

    // Update the previous state
    setPreviousIsTurn(isTurn)
  }, [isTurn, previousIsTurn])

  // Get avatar design based on personality
  const getAvatarDesign = () => {
    const { personality } = getNicknameAndPersonality()
    const firstLetter = getDisplayName().charAt(0).toUpperCase()
    const emotionEmoji = getEmotionEmoji()

    // Different avatar designs based on personality
    switch (personality) {
      case "aggressive":
        return (
          <div className="bg-gradient-to-br from-red-600 to-red-700 w-full h-full rounded-full flex items-center justify-center overflow-hidden">
            <div className="text-white font-bold text-base relative z-10">
              {firstLetter}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center">
              🔥
            </div>
            {/* Emotion display */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse z-20"
              title={getEmotionTooltip()}
            >
              {emotionEmoji}
            </div>
          </div>
        )
      case "tight":
        return (
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 w-full h-full rounded-full flex items-center justify-center overflow-hidden">
            <div className="text-white font-bold text-base relative z-10">
              {firstLetter}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)]"></div>
            <div className="absolute top-0 right-0 w-3 h-3 flex items-center justify-center">
              🔒
            </div>
            {/* Emotion display */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse z-20"
              title={getEmotionTooltip()}
            >
              {emotionEmoji}
            </div>
          </div>
        )
      case "analytical":
        return (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 w-full h-full rounded-full flex items-center justify-center overflow-hidden">
            <div className="text-white font-bold text-base relative z-10">
              {firstLetter}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2)_0%,transparent_70%)]"></div>
            <div className="absolute top-0 left-0 w-3 h-3 flex items-center justify-center">
              🧮
            </div>
            {/* Emotion display */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse z-20"
              title={getEmotionTooltip()}
            >
              {emotionEmoji}
            </div>
          </div>
        )
      case "loose":
        return (
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-full h-full rounded-full flex items-center justify-center overflow-hidden">
            <div className="text-white font-bold text-base relative z-10">
              {firstLetter}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)]"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 flex items-center justify-center">
              🎲
            </div>
            {/* Emotion display */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse z-20"
              title={getEmotionTooltip()}
            >
              {emotionEmoji}
            </div>
          </div>
        )
      case "bluffer":
        return (
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 w-full h-full rounded-full flex items-center justify-center overflow-hidden">
            <div className="text-white font-bold text-base relative z-10">
              {firstLetter}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(255,255,255,0.1)_100%)]"></div>
            <div className="absolute top-0 right-0 w-3 h-3 flex items-center justify-center">
              🃏
            </div>
            {/* Emotion display */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse z-20"
              title={getEmotionTooltip()}
            >
              {emotionEmoji}
            </div>
          </div>
        )
      default:
        // Generic avatar for other personalities
        return (
          <div
            className={`${getAvatarColor()} w-full h-full rounded-full flex items-center justify-center`}
          >
            <div className="text-white font-bold text-base">{firstLetter}</div>
            <div className="absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center">
              {getPersonalityIcon()}
            </div>
            {/* Emotion display */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse z-20"
              title={getEmotionTooltip()}
            >
              {emotionEmoji}
            </div>
          </div>
        )
    }
  }

  // Periodically animate active players' avatars for a "breathing" effect
  useEffect(() => {
    if (isTurn) {
      const interval = setInterval(() => {
        setAnimateAvatar((prev) => !prev)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isTurn])

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

  const getEquityBackground = () => {
    if (equity === undefined || !isActive || !hand) return "bg-gray-500"
    if (equity >= 75) return "bg-green-500"
    if (equity >= 50) return "bg-lime-400"
    if (equity >= 30) return "bg-yellow-400"
    if (equity >= 15) return "bg-orange-400"
    return "bg-red-400"
  }

  // Generate avatar color based on player personality
  const getAvatarColor = () => {
    const { personality } = getNicknameAndPersonality()

    const personalityColors: Record<string, string> = {
      aggressive: "bg-gradient-to-br from-red-600 to-red-700",
      tight: "bg-gradient-to-br from-blue-700 to-blue-800",
      analytical: "bg-gradient-to-br from-indigo-600 to-indigo-700",
      loose: "bg-gradient-to-br from-purple-500 to-purple-600",
      conservative: "bg-gradient-to-br from-teal-600 to-teal-700",
      bluffer: "bg-gradient-to-br from-amber-500 to-amber-600",
      passive: "bg-gradient-to-br from-green-600 to-green-700",
      unpredictable: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600",
      balanced: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      "risk-taker": "bg-gradient-to-br from-orange-500 to-orange-600",
      cautious: "bg-gradient-to-br from-cyan-600 to-cyan-700",
    }

    return (
      personalityColors[personality] ||
      "bg-gradient-to-br from-gray-600 to-gray-700"
    )
  }

  // Format player name for display (clean up nickname format)
  const getDisplayName = () => {
    const { nickname } = getNicknameAndPersonality()

    // Check if the name matches our expected format with a nickname
    const nameMatch = name.match(/^(.*?)\s+'([^']+)'(.*?)$/)

    if (nameMatch) {
      const firstName = nameMatch[1]
      const lastName = nameMatch[3]

      // Display first name and last initial for cleaner look
      return `${firstName} '${nickname}'`
    }

    return name
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
          animation: "rise-fade 2s forwards",
          boxShadow:
            "0 6px 12px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.2)",
        }}
      >
        <span className="mr-1.5">{icon}</span>
        {text}
      </div>
    )
  }

  // Calculate spotlight opacity based on player state
  const getSpotlightOpacity = () => {
    if (isWinner) return 0.4
    if (isTurn) return 0.2
    return 0
  }

  // Enhanced winner effects
  const winnerGlowStyle = isWinner
    ? {
        animation: "pulse 1.5s infinite",
        boxShadow:
          "0 0 25px rgba(250, 204, 21, 0.7), 0 0 15px rgba(250, 204, 21, 0.5)",
        transform: "scale(1.05)",
      }
    : {}

  return (
    <div
      className={`absolute ${positionClass} ${
        isTurn ? "z-20" : isWinner ? "z-30" : "z-10"
      } 
                transition-all duration-500`}
    >
      {/* Player spotlight for active player */}
      {(isTurn || isWinner) && (
        <div
          className={`absolute -inset-4 rounded-full transition-opacity duration-700 ${
            isWinner
              ? "bg-gradient-radial from-yellow-400/40 to-transparent"
              : "bg-gradient-radial from-blue-400/20 to-transparent"
          }`}
          style={{
            opacity: getSpotlightOpacity(),
            animation: isWinner ? "winner-pulse 2s infinite" : "",
          }}
        ></div>
      )}

      {/* Emotion bubble animation when player finishes their turn */}
      {showEmotionAnimation && (
        <div
          className="absolute -right-12 top-0 z-40"
          style={{
            animation: "fade-in-out 3s forwards",
          }}
        >
          <div className="relative">
            <div className="bg-white bg-opacity-90 rounded-full p-4 shadow-lg">
              <span className="text-4xl">{getEmotionEmoji()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Confetti effect for winner */}
      {isWinner && (
        <div className="absolute -inset-10 overflow-hidden pointer-events-none">
          <div className="confetti-container">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`confetti confetti-${i % 5}`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              ></div>
            ))}
          </div>
        </div>
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
                    !showCards && hand && isActive
                      ? "cursor-pointer hover:shadow-lg hover:shadow-green-900/50"
                      : ""
                  }
                  shadow-md hover:shadow-lg
                  transition-all duration-300 ${
                    isHovered ? "transform scale-105" : ""
                  } ${
          isTurn
            ? `transform ${
                animateAvatar ? "scale-110" : "scale-105"
              } transition-transform duration-1000`
            : ""
        }`}
        style={{
          ...(isWinner
            ? winnerGlowStyle
            : {
                boxShadow: isTurn
                  ? "0 0 12px rgba(96, 165, 250, 0.4)"
                  : "0 4px 6px rgba(0, 0, 0, 0.2)",
              }),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {showAction && getActionDisplay()}

        {/* Personality Pill - Shows personality type above player */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gray-800/90 text-white text-xs font-medium border border-gray-700 flex items-center gap-1.5 backdrop-blur-sm">
          <span>{getPersonalityIcon()}</span>
          <span className="capitalize">
            {getNicknameAndPersonality().personality}
          </span>
        </div>

        {/* Player cards */}
        <div className="relative flex justify-center mb-3 mt-0.5">
          {hand ? (
            <>
              <div
                className={`transform transition-all duration-500 ${
                  isHovered || showCards
                    ? "rotate-0 translate-x-[-9px]"
                    : "rotate-[-5deg] translate-x-[-12px]"
                }`}
              >
                <Card card={hand[0]} faceUp={isHovered || showCards} />
              </div>
              <div
                className={`transform transition-all duration-500 ${
                  isHovered || showCards
                    ? "rotate-0 translate-x-[9px]"
                    : "rotate-[5deg] translate-x-[12px]"
                }`}
              >
                <Card card={hand[1]} faceUp={isHovered || showCards} />
              </div>

              {/* Card value tooltip that appears on hover */}
              {(isHovered || showCards) && hand[0] && hand[1] && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white 
                          px-2.5 py-1 rounded text-sm font-semibold shadow-lg z-20 opacity-90
                          border border-gray-700 backdrop-blur-sm"
                >
                  <span
                    className={`${
                      hand[0].suit === "hearts" || hand[0].suit === "diamonds"
                        ? "text-red-500"
                        : "text-white"
                    }`}
                  >
                    {hand[0].rank}
                    {getCardSuitSymbol(hand[0].suit)}
                  </span>{" "}
                  <span
                    className={`${
                      hand[1].suit === "hearts" || hand[1].suit === "diamonds"
                        ? "text-red-500"
                        : "text-white"
                    }`}
                  >
                    {hand[1].rank}
                    {getCardSuitSymbol(hand[1].suit)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="h-16 flex items-center justify-center text-gray-500">
              No cards
            </div>
          )}

          {/* Dealer button */}
          {isDealer && (
            <div
              className="absolute -top-2 -left-3 bg-white text-gray-900 w-6 h-6 rounded-full 
                      flex items-center justify-center text-xs font-bold border-2 border-gray-700 shadow"
            >
              D
            </div>
          )}
        </div>

        {/* Player info section */}
        <div className="flex flex-col">
          {/* Player name and avatar */}
          <div className="flex items-center mb-2 relative">
            <div
              className={`w-8 h-8 rounded-full mr-2 relative flex shadow-md overflow-hidden
                        transition-all duration-300 ${
                          animateAvatar && isTurn ? "scale-110" : ""
                        }`}
            >
              {getAvatarDesign()}
            </div>

            <div
              className={`text-sm font-medium flex-1 truncate ${
                isActive ? "text-white" : "text-gray-400"
              }`}
            >
              {getDisplayName()}
            </div>
          </div>

          {/* Chips and bet info */}
          <div
            className={`flex justify-between items-center text-sm ${
              isActive ? "opacity-100" : "opacity-70"
            }`}
          >
            <div
              className={`font-medium ${
                chips <= 10 ? "text-red-400" : "text-green-400"
              }`}
            >
              ${chips}
            </div>
            {currentBet > 0 && (
              <div className="font-medium text-amber-400">
                Bet: ${currentBet}
              </div>
            )}
            {isAllIn && (
              <div className="ml-auto text-xs px-1.5 py-0.5 bg-red-900/70 rounded text-white font-bold animate-pulse">
                ALL IN
              </div>
            )}
          </div>

          {/* Equity bar */}
          {equity !== undefined && isActive && hand && (
            <div className="mt-2">
              <div className="flex justify-between items-center text-xs mb-1">
                <div className={`${getEquityColor()} font-medium`}>
                  Equity:{" "}
                  {equity !== undefined ? equity.toFixed(1) + "%" : "N/A"}
                </div>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getEquityBackground()} transition-all duration-500`}
                  style={{ width: `${equity || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Winner indicator */}
        {isWinner && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30">
            <div className="text-5xl mb-2 winner-trophy">🏆</div>
            <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-white font-bold px-4 py-1.5 rounded-lg shadow-lg text-lg winner-banner">
              WINNER
            </div>
          </div>
        )}

        {/* Fold overlay */}
        {!isActive && hand && (
          <div
            className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center backdrop-blur-sm"
            style={{ backdropFilter: "blur(2px)" }}
          >
            <div className="text-white font-bold bg-red-900/80 px-3 py-1 rounded shadow">
              FOLDED
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
