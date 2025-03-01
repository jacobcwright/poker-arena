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

        {/* Table logo watermark */}
        <div className="table-logo"></div>

        {/* Subtle dealer positions markers - removed horizontal ones */}
        <div className="absolute h-full w-full rounded-[50%] opacity-10">
          {[...Array(8)].map((_, i) => {
            // Skip horizontal lines (position 2 and 6)
            if (i === 2 || i === 6) return null

            return (
              <div
                key={i}
                className="absolute w-6 h-1 bg-white rounded-full transform -translate-x-1/2"
                style={{
                  top: i === 0 ? "88%" : i === 4 ? "12%" : "50%",
                  left: i === 2 ? "88%" : i === 6 ? "12%" : "50%",
                  transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                }}
              ></div>
            )
          })}
        </div>
      </div>

      {/* Community Cards with enhanced positioning */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col items-center">
          <div className="flex gap-3 mb-6">
            {communityCards.length > 0 ? (
              communityCards.map((card, index) => (
                <div
                  key={index}
                  className="transform hover:scale-110 hover:-translate-y-2 transition-all duration-200 card-shadow"
                >
                  <Card key={index} card={card} />
                </div>
              ))
            ) : (
              <div className="text-white text-center text-xl font-light tracking-wider opacity-80">
                {currentPhase === "idle"
                  ? "Ready to Deal"
                  : "Waiting for cards..."}
              </div>
            )}
          </div>

          <div className="bg-green-900 bg-opacity-50 backdrop-blur-sm px-6 py-3 rounded-full text-white text-xl font-bold mb-2 shadow-lg border border-green-700">
            <span className="mr-1 text-yellow-400">$</span>
            {pot}
          </div>
        </div>
      </div>

      {/* Players */}
      {players.map((player, index) => {
        // Custom position mapping for different player counts
        let positionIndex

        // Specific mappings for common player counts
        if (players.length === 6) {
          // For 6 players, use these specific positions (evenly spaced)
          const sixPlayerPositions = [0, 1, 3, 4, 5, 7] // Skip positions 2 and 6 for better spacing
          positionIndex = sixPlayerPositions[index]
        } else if (players.length === 2) {
          // For heads-up play (2 players)
          const twoPlayerPositions = [0, 4] // Top and bottom only
          positionIndex = twoPlayerPositions[index]
        } else if (players.length === 3) {
          // For 3 players
          const threePlayerPositions = [0, 3, 5] // Bottom, top-right, top-left
          positionIndex = threePlayerPositions[index]
        } else if (players.length === 4) {
          // For 4 players
          const fourPlayerPositions = [0, 2, 4, 6] // Bottom, right, top, left
          positionIndex = fourPlayerPositions[index]
        } else if (players.length === 5) {
          // For 5 players
          const fivePlayerPositions = [0, 1, 3, 5, 7] // Distributed around the table
          positionIndex = fivePlayerPositions[index]
        } else {
          // General formula for other player counts
          positionIndex = Math.floor((index * 8) / players.length) % 8
        }

        return (
          <Player
            key={player.id}
            player={player}
            position={positionIndex}
            showCards={currentPhase === "showdown"}
            isWinner={winningPlayers?.includes(player.id)}
          />
        )
      })}

      {/* Improved Hand results overlay for showdown - with enhanced design */}
      {/* {showHandResults && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 transform -translate-y-1/3 z-50">
          <div className="bg-gray-900 bg-opacity-95 p-6 rounded-lg text-white min-w-[400px] shadow-2xl border border-yellow-500 backdrop-blur-sm">
            <div className="absolute inset-0 bg-yellow-400 opacity-5 rounded-lg"></div>
            <h3 className="text-center font-bold text-2xl mb-4 text-yellow-400 tracking-wider">
              Hand Results
            </h3>
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
              {Object.entries(handResults).map(([playerId, description]) => {
                const player = players.find((p) => p.id === Number(playerId))
                const isWinner = winningPlayers?.includes(Number(playerId))

                return player ? (
                  <div
                    key={playerId}
                    className={`p-3 rounded-md ${
                      isWinner
                        ? "bg-gradient-to-r from-yellow-900 to-amber-900 text-yellow-300 font-bold border border-yellow-600"
                        : "bg-gray-800 bg-opacity-60 text-gray-300 border border-gray-700"
                    } transition-all duration-300`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-lg">{player.name}:</span>
                      {isWinner && (
                        <span className="text-2xl animate-pulse">🏆</span>
                      )}
                    </div>
                    <div className="text-sm mt-2 font-light tracking-wide">
                      {description}
                    </div>
                  </div>
                ) : null
              })}
            </div>
          </div>
        </div>
      )} */}
    </div>
  )
}
