import { GameState } from "../types"
import Card from "./Card"
import Player from "./Player"

interface PokerTableProps {
  gameState: GameState
}

export default function PokerTable({ gameState }: PokerTableProps) {
  const {
    players,
    communityCards,
    pot,
    currentPhase,
    winningPlayers = [],
    handResults = {},
  } = gameState

  // Show hand results in showdown phase
  const showHandResults =
    currentPhase === "showdown" && Object.keys(handResults).length > 0

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

          <div className="bg-green-700 px-4 py-2 rounded-full text-white text-lg font-bold mb-2">
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
          isWinner={winningPlayers?.includes(player.id)}
        />
      ))}

      {/* Improved Hand results overlay for showdown - moved outside the cards div and given a higher z-index */}
      {showHandResults && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 transform -translate-y-1/3 z-50">
          <div className="bg-black bg-opacity-90 p-4 rounded-lg text-white min-w-[350px] shadow-xl border-2 border-yellow-500">
            <h3 className="text-center font-bold text-xl mb-3 text-yellow-400">
              Hand Results
            </h3>
            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto">
              {Object.entries(handResults).map(([playerId, description]) => {
                const player = players.find((p) => p.id === Number(playerId))
                const isWinner = winningPlayers?.includes(Number(playerId))

                return player ? (
                  <div
                    key={playerId}
                    className={`p-2 rounded ${
                      isWinner
                        ? "bg-yellow-900 bg-opacity-50 text-yellow-400 font-bold"
                        : "text-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{player.name}:</span>
                      {isWinner && <span className="text-xl">🏆</span>}
                    </div>
                    <div className="text-sm mt-1">{description}</div>
                  </div>
                ) : null
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
