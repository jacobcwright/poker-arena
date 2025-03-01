import { useState, useEffect, useRef } from "react"
import { ActivityLogEntry, GameState } from "../types"
import { motion, AnimatePresence } from "framer-motion"

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
  const [expandedEntries, setExpandedEntries] = useState<{
    [key: number]: boolean
  }>({})
  const [summaries, setSummaries] = useState<{ [key: number]: string }>({})
  const [loadingStates, setLoadingStates] = useState<{
    [key: number]: boolean
  }>({})
  const [newEntryIndex, setNewEntryIndex] = useState<number | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const processedEntries = useRef<Set<number>>(new Set())
  const prevLogLength = useRef<number>(0)
  const [newEntryAdded, setNewEntryAdded] = useState(false)

  // Update log when gameState changes
  useEffect(() => {
    if (gameState?.activityLog) {
      setActivityLog(gameState.activityLog)

      // Check if new entries were added
      if (gameState.activityLog.length > prevLogLength.current) {
        // Set flag to indicate new entry was added
        setNewEntryAdded(true)

        // Reset flag after animation completes
        setTimeout(() => {
          setNewEntryAdded(false)
        }, 1000)
      }

      prevLogLength.current = gameState.activityLog.length

      // Auto-scroll to top of log for descending order
      if (logContainerRef.current && isOpen) {
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0
          }
        }, 100)
      }

      // Generate summaries for new entries
      gameState.activityLog.forEach((entry, index) => {
        if (entry.chainOfThought && !processedEntries.current.has(index)) {
          processedEntries.current.add(index)
        }
      })
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

  // Get emoji based on emotion
  const getEmotionEmoji = (emotion?: string): string => {
    switch (emotion) {
      case "neutral":
        return "😐"
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
      default:
        return "😶"
    }
  }

  // Toggle expansion of a specific entry
  const toggleExpand = (index: number) => {
    setExpandedEntries((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  // Check if entry has reasoning content (either chainOfThought or reasoningSummary)
  const hasReasoningContent = (entry: ActivityLogEntry): boolean => {
    return (
      !!(entry.chainOfThought && entry.chainOfThought.trim()) ||
      !!(entry.reasoningSummary && entry.reasoningSummary.trim())
    )
  }

  return (
    <div
      className={`activity-log-container fixed right-0 top-0 h-full z-10 transition-all duration-300 ${
        isOpen ? "w-96" : "w-2"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gray-800 text-white p-4 rounded-l-md hover:bg-gray-700 transition-colors text-2xl"
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
            <span className="text-sm text-gray-400">
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
              <AnimatePresence initial={false}>
                {[...activityLog].reverse().map((entry, index) => (
                  <motion.div
                    key={index}
                    initial={
                      index === 0 && newEntryAdded
                        ? { x: "100%", opacity: 0 }
                        : newEntryAdded
                        ? { y: -50, opacity: 0.7 }
                        : { opacity: 1 }
                    }
                    animate={{ x: 0, y: 0, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      delay:
                        index === 0 && newEntryAdded
                          ? 0
                          : Math.min(index * 0.04, 0.3),
                    }}
                    className="activity-log-entry bg-gray-800 rounded p-2 text-md mb-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-white flex items-center">
                        {entry.playerName}
                        {entry.emotion && (
                          <span className="ml-2 text-lg" title={entry.emotion}>
                            {getEmotionEmoji(entry.emotion)}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-gray-400">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    <div className={`${getActionColor(entry.action)}`}>
                      {entry.description}
                    </div>

                    {hasReasoningContent(entry) && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleExpand(index)}
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center mb-1"
                        >
                          {expandedEntries[index]
                            ? "Hide thought process"
                            : "Show thought process"}
                          <svg
                            className={`ml-1 w-3 h-3 transition-transform ${
                              expandedEntries[index] ? "rotate-180" : ""
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>

                        <AnimatePresence>
                          {expandedEntries[index] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="p-2 bg-gray-700 rounded text-sm text-gray-300 overflow-hidden"
                            >
                              {entry.reasoningSummary && (
                                <div className="mb-3">
                                  <div className="font-semibold text-yellow-300 mb-1">
                                    Summary:
                                  </div>
                                  <div className="text-gray-200 font-medium mb-2">
                                    {entry.reasoningSummary}
                                  </div>
                                </div>
                              )}

                              {entry.chainOfThought && (
                                <div>
                                  <div className="font-semibold mb-1">
                                    Thought Process:
                                  </div>
                                  <div className="text-gray-300 italic">
                                    {entry.chainOfThought}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500">
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
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLog
