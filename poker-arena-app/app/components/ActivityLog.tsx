import { useState, useEffect, useRef } from "react"
import { ActivityLogEntry, GameState } from "../types"

interface ActivityLogProps {
  gameState: GameState | null
  isOpen: boolean
  onToggle: () => void
}

const ActivityLog: React.FC<ActivityLogProps> = ({
  gameState,
  isOpen,
  onToggle,
}) => {
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Update log when gameState changes
  useEffect(() => {
    if (gameState?.activityLog) {
      setActivityLog(gameState.activityLog)
      // Auto-scroll to bottom of log
      if (logContainerRef.current && isOpen) {
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
              logContainerRef.current.scrollHeight
          }
        }, 100)
      }
    }
  }, [gameState?.activityLog, isOpen])

  // Format timestamp (convert to readable time)
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Get color based on action type
  const getActionColor = (action: string): string => {
    switch (action) {
      case "fold":
        return "text-red-400"
      case "check":
        return "text-blue-400"
      case "call":
        return "text-yellow-400"
      case "bet":
      case "raise":
        return "text-green-400"
      case "allIn":
        return "text-purple-400"
      case "win":
        return "text-amber-400 font-bold"
      case "phase":
        return "text-cyan-400 font-semibold"
      case "deal":
        return "text-indigo-400"
      case "blind":
        return "text-pink-400"
      default:
        return "text-gray-300"
    }
  }

  // Get color based on equity value
  const getEquityColor = (equity?: number): string => {
    if (equity === undefined) return "text-gray-500"
    if (equity >= 75) return "text-green-500"
    if (equity >= 50) return "text-lime-400"
    if (equity >= 30) return "text-yellow-400"
    if (equity >= 15) return "text-orange-400"
    return "text-red-400"
  }

  return (
    <div
      className={`activity-log-container fixed right-0 top-0 h-full z-10 transition-all duration-300 ${
        isOpen ? "w-80" : "w-12"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gray-800 text-white p-2 rounded-l-md hover:bg-gray-700 transition-colors"
      >
        {isOpen ? "→" : "←"}
      </button>

      <div className="h-full bg-gray-900 bg-opacity-95 border-l border-gray-700 flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
          <h3 className="text-white font-semibold">
            {isOpen ? "Activity Log" : ""}
          </h3>
          {isOpen && (
            <span className="text-xs text-gray-400">
              {activityLog.length} actions
            </span>
          )}
        </div>

        {/* Log entries */}
        {isOpen && (
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-700"
          >
            {activityLog.length === 0 ? (
              <p className="text-gray-500 text-center italic">
                No activity yet
              </p>
            ) : (
              activityLog.map((entry, index) => (
                <div
                  key={index}
                  className="activity-log-entry bg-gray-800 rounded p-2 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-white">
                      {entry.playerName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <div className={`${getActionColor(entry.action)}`}>
                    {entry.description}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      Phase: {entry.phase}
                    </span>
                    {entry.equity !== undefined && (
                      <span
                        className={`text-xs font-semibold ${getEquityColor(
                          entry.equity
                        )}`}
                      >
                        Equity: {entry.equity.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLog
