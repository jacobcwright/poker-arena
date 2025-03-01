import { Player as PlayerType } from "../types"
import Card from "./Card"

interface PlayerProps {
  player: PlayerType
  position: number
  showCards?: boolean
}

export default function Player({
  player,
  position,
  showCards = false,
}: PlayerProps) {
  const { name, hand, chips, currentBet, isActive, isDealer, isTurn, isAllIn } =
    player

  // Positioning classes based on position
  const positions = [
    "bottom-4 left-1/2 -translate-x-1/2", // Bottom center
    "bottom-1/4 right-4", // Bottom right
    "top-1/2 right-4 -translate-y-1/2", // Right
    "top-4 right-1/3", // Top right
    "top-4 left-1/2 -translate-x-1/2", // Top center
    "top-4 left-1/3", // Top left
    "top-1/2 left-4 -translate-y-1/2", // Left
    "bottom-1/4 left-4", // Bottom left
  ]

  const positionClass = positions[position % positions.length]

  return (
    <div
      className={`absolute ${positionClass} ${
        isTurn ? "scale-110" : ""
      } transition-all duration-300`}
    >
      <div
        className={`bg-gray-800 rounded-lg p-3 border-2 ${
          isTurn ? "border-yellow-400" : "border-gray-700"
        }`}
      >
        <div className="flex flex-col items-center">
          <div className="flex gap-1 mb-2">
            {hand ? (
              <>
                <Card card={hand[0]} hidden={!showCards && !isActive} />
                <Card card={hand[1]} hidden={!showCards && !isActive} />
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
            <div className="font-bold">{name}</div>
          </div>

          <div className="flex gap-2 text-sm mt-1">
            <div className="text-green-400">${chips}</div>
            {currentBet > 0 && (
              <div className="text-yellow-400">Bet: ${currentBet}</div>
            )}
            {isAllIn && <div className="text-red-400">ALL IN</div>}
            {!isActive && <div className="text-gray-400">FOLDED</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
