import { GameStats } from "../types"

interface StatsPanelProps {
  stats: GameStats
  playerNames: Record<number, string>
}

export default function StatsPanel({ stats, playerNames }: StatsPanelProps) {
  const { handsPlayed, biggestPot, biggestWin, handWins } = stats

  // Find the player with the most wins
  let bestPlayer = -1
  let mostWins = 0

  Object.entries(handWins).forEach(([playerId, wins]) => {
    if (wins > mostWins) {
      mostWins = wins
      bestPlayer = Number(playerId)
    }
  })

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Game Statistics</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400">Hands Played: {handsPlayed}</p>
          <p className="text-gray-400">Biggest Pot: ${biggestPot}</p>
          {bestPlayer !== -1 && (
            <p className="text-gray-400">
              Best Player: {playerNames[bestPlayer]} ({mostWins} wins)
            </p>
          )}
        </div>

        <div>
          <p className="text-gray-400 font-semibold mb-1">Win Count:</p>
          <div className="flex flex-col space-y-1">
            {Object.entries(handWins)
              .sort(([, a], [, b]) => b - a)
              .map(([playerId, wins]) => (
                <p key={playerId} className="text-gray-400 text-sm">
                  {playerNames[Number(playerId)]}: {wins} wins
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
