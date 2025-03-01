import { GameState } from "../types"
import Card from "./Card"
import Player from "./Player"

interface PokerTableProps {
  gameState: GameState
}

export default function PokerTable({ gameState }: PokerTableProps) {
  const { players, communityCards, pot, currentPhase } = gameState

  return (
    <div className="aspect-[16/9] bg-green-800 rounded-[50%] relative border-8 border-brown-800 mb-8">
      {/* Community Cards */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <div className="flex gap-2 mb-4">
            {communityCards.length > 0 ? (
              communityCards.map((card, index) => (
                <Card key={index} card={card} />
              ))
            ) : (
              <div className="text-white text-center">
                {currentPhase === "idle"
                  ? "Game Ready"
                  : "Waiting for cards..."}
              </div>
            )}
          </div>

          <div className="bg-green-700 px-4 py-2 rounded-full text-white text-lg font-bold">
            Pot: ${pot}
          </div>
        </div>
      </div>

      {/* Players */}
      {players.map((player, index) => (
        <Player
          key={player.id}
          player={player}
          position={index}
          showCards={currentPhase === "showdown"}
        />
      ))}
    </div>
  )
}
