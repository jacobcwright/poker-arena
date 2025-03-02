"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  LineChart,
  Line,
  Legend,
} from "recharts"
import Navbar from "../components/Navbar"

interface ModelProfit {
  winner_id?: string
  profit: number
  modelName: string
  gamesCount: number
}

interface TimeSeriesDataPoint {
  model: string
  balance: number
  timestamp: string
  gameId: string
  roundId: string
}

// Format number as USD currency
const formatDollar = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function StatsPage() {
  const [data, setData] = useState<ModelProfit[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>(
    []
  )
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableGames, setAvailableGames] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("all")
  const [selectedGame, setSelectedGame] = useState<string>("all")
  const [chartView, setChartView] = useState<"average" | "timeSeries">(
    "average"
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animationActive, setAnimationActive] = useState(false)

  // Colors for line chart
  const lineColors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088fe",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#a4de6c",
    "#d0ed57",
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch time series data first to ensure we have it for both charts
        const timeSeriesResponse = await fetch("/api/model-stats")
        if (!timeSeriesResponse.ok) {
          throw new Error(
            `Error fetching time series: ${timeSeriesResponse.status}`
          )
        }

        const timeSeriesResult = await timeSeriesResponse.json()
        setTimeSeriesData(timeSeriesResult.data)
        setAvailableModels(timeSeriesResult.models)
        setAvailableGames(timeSeriesResult.games)

        // Also fetch the all-model-stats for comparison (but we won't use it directly)
        const response = await fetch("/api/all-model-stats")
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        const result = await response.json()
        setData(result.data)

        // Trigger animation after data is loaded
        setTimeout(() => {
          setAnimationActive(true)
        }, 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        console.error("Error fetching data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch time series data when filters change
  useEffect(() => {
    const fetchTimeSeriesData = async () => {
      try {
        setLoading(true)

        // Build URL with query parameters
        let url = "/api/model-stats"
        const params = new URLSearchParams()

        if (selectedModel !== "all") {
          params.append("model", selectedModel)
        }

        if (selectedGame !== "all") {
          params.append("gameId", selectedGame)
        }

        if (params.toString()) {
          url += `?${params.toString()}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const result = await response.json()
        setTimeSeriesData(result.data)

        // If filter changes resulted in new available options, update them
        if (!selectedModel) {
          setAvailableModels(result.models)
        }

        if (!selectedGame) {
          setAvailableGames(result.games)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred fetching time series data"
        )
        console.error("Error fetching time series data:", err)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch if we're viewing the time series and have initial data loaded
    if (chartView === "timeSeries" && availableModels.length > 0) {
      fetchTimeSeriesData()
    }
  }, [selectedModel, selectedGame, chartView])

  // Prepare time series data for charting, grouped by both model and gameId
  const prepareTimeSeriesData = () => {
    if (timeSeriesData.length === 0) return []

    // Create a map to track the last known balance for each model+gameId combo
    const lastKnownBalances = new Map<string, number>()

    // First, group all data points by timestamp
    const groupedByTimestamp = timeSeriesData.reduce((acc, dataPoint) => {
      const dateStr = new Date(dataPoint.timestamp).toLocaleString()

      if (!acc[dateStr]) {
        acc[dateStr] = {
          timestamp: dateStr,
        }
      }

      // Add balance for this model+gameId at this timestamp
      const modelGameKey = `${dataPoint.model}:${dataPoint.gameId.slice(0, 8)}`
      acc[dateStr][modelGameKey] = dataPoint.balance

      // Update last known balance for this model+gameId
      lastKnownBalances.set(modelGameKey, dataPoint.balance)

      return acc
    }, {} as Record<string, any>)

    // Get all unique model+gameId combinations
    const allModelGameCombos = getUniqueModelGameCombos()

    // Get all timestamps and sort them chronologically
    const allTimestamps = Object.keys(groupedByTimestamp).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime()
    })

    // Ensure each timestamp has entries for all model+gameId combos
    // by carrying forward the last known value
    allTimestamps.forEach((timestamp, index) => {
      const timestampData = groupedByTimestamp[timestamp]

      allModelGameCombos.forEach((modelGameKey) => {
        // If this timestamp doesn't have data for this model+gameId
        if (timestampData[modelGameKey] === undefined) {
          // Try to find the last known balance for this model+gameId
          // from previous timestamps
          if (lastKnownBalances.has(modelGameKey)) {
            timestampData[modelGameKey] = lastKnownBalances.get(modelGameKey)
          }
          // For the special case where there's no previous data but there might be
          // future data, we'll leave it undefined and let Recharts skip this point
        }
      })
    })

    // Convert to array for Recharts and sort by timestamp
    return allTimestamps.map((timestamp) => groupedByTimestamp[timestamp])
  }

  // Get unique model+gameId combinations in the time series data
  const getUniqueModelGameCombos = () => {
    const modelGameCombos = new Set<string>()
    timeSeriesData.forEach((dataPoint) => {
      const modelGameKey = `${dataPoint.model}:${dataPoint.gameId.slice(0, 8)}`
      modelGameCombos.add(modelGameKey)
    })
    return Array.from(modelGameCombos)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading data: {error}</p>
        </div>
      </div>
    )
  }

  // Create custom data with model names as labels
  const chartData = data.map((item) => ({
    ...item,
    name: item.modelName, // Use model name as the display name
  }))

  // Prepare time series data
  const timeSeriesChartData = prepareTimeSeriesData()
  const uniqueModelGameCombos = getUniqueModelGameCombos()

  // Calculate average balances directly from timeSeriesData
  const calculateAveragesFromTimeSeriesData = () => {
    if (timeSeriesData.length === 0) return []

    // Group all balances by model
    const modelBalances: Record<
      string,
      { balances: number[]; gameIds: Set<string> }
    > = {}

    // First collect all balance values for each model
    timeSeriesData.forEach((dataPoint) => {
      const model = dataPoint.model

      if (!modelBalances[model]) {
        modelBalances[model] = {
          balances: [],
          gameIds: new Set(),
        }
      }

      // Store each individual balance
      modelBalances[model].balances.push(dataPoint.balance)
      modelBalances[model].gameIds.add(dataPoint.gameId)
    })

    // Convert to array format for the bar chart
    return Object.entries(modelBalances)
      .map(([model, data]) => {
        // Calculate the average of all balances for this model
        const totalBalance = data.balances.reduce(
          (sum, balance) => sum + balance,
          0
        )
        const averageBalance =
          data.balances.length > 0
            ? Math.round(totalBalance / data.balances.length)
            : 0

        return {
          modelName: model,
          name: model,
          profit: averageBalance, // Average of all balance entries
          gamesCount: data.gameIds.size, // Number of unique games
          balanceCount: data.balances.length, // Number of balance data points
        }
      })
      .sort((a, b) => b.profit - a.profit) // Sort by average balance descending
  }

  // Use calculated averages for the bar chart
  const calculatedChartData = calculateAveragesFromTimeSeriesData()

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Poker Model Performance
        </h1>

        {/* Info Card */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <svg
                className="h-5 w-5 text-blue-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                About Model Performance
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  The <strong>Average Balance</strong> chart shows the average
                  balance of each AI model across all poker games.
                </p>
                <p className="mt-1">
                  The <strong>Balance Over Time</strong> chart tracks how each
                  model's balance changes during gameplay, with separate lines
                  for each model in each game.
                </p>
                <p className="mt-1">
                  All models are included in these stats, regardless of whether
                  they've won any games.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Type Selector */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                chartView === "average"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
              onClick={() => setChartView("average")}
            >
              Average Balance
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                chartView === "timeSeries"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
              onClick={() => setChartView("timeSeries")}
            >
              Balance Over Time
            </button>
          </div>
        </div>

        {/* Filters for Time Series */}
        {chartView === "timeSeries" && (
          <div className="mb-6 flex flex-wrap gap-4 justify-center">
            <div className="w-64">
              <label
                htmlFor="modelSelect"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Model
              </label>
              <select
                id="modelSelect"
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="all">All Models</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-64">
              <label
                htmlFor="gameSelect"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Game
              </label>
              <select
                id="gameSelect"
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg w-full p-2.5"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
              >
                <option value="all">All Games</option>
                {availableGames.map((game) => (
                  <option key={game} value={game}>
                    Game {game.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === "average" ? (
                <BarChart
                  data={calculatedChartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 80,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  >
                    <Label
                      value="Model"
                      position="bottom"
                      offset={20}
                      style={{
                        textAnchor: "middle",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    />
                  </XAxis>
                  <YAxis tickFormatter={formatDollar} width={90}>
                    <Label
                      value="Average of All Balances"
                      position="left"
                      angle={-90}
                      offset={10}
                      style={{
                        textAnchor: "middle",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    />
                  </YAxis>
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "profit") {
                        return [formatDollar(value as number), "Avg. Balance"]
                      }
                      return [value, name]
                    }}
                    labelFormatter={(label) => `Model: ${label}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-gray-300 shadow-md rounded">
                            <p className="font-bold">{`Model: ${label}`}</p>
                            <p>{`Average Balance: ${formatDollar(
                              data.profit
                            )}`}</p>
                            <p>{`Balance Data Points: ${data.balanceCount}`}</p>
                            <p>{`Games Played: ${data.gamesCount}`}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="profit"
                    name="Average Balance"
                    fill="#8884d8"
                    animationBegin={0}
                    animationDuration={2000}
                    animationEasing="ease-out"
                    isAnimationActive={animationActive}
                  />
                </BarChart>
              ) : (
                // Time Series Line Chart - updated with model+gameId grouping
                <LineChart
                  data={timeSeriesChartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 80,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  >
                    <Label
                      value="Time"
                      position="bottom"
                      offset={20}
                      style={{
                        textAnchor: "middle",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    />
                  </XAxis>
                  <YAxis tickFormatter={formatDollar} width={90}>
                    <Label
                      value="Balance"
                      position="left"
                      angle={-90}
                      offset={10}
                      style={{
                        textAnchor: "middle",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    />
                  </YAxis>
                  <Tooltip
                    formatter={(value) => [
                      formatDollar(value as number),
                      "Balance",
                    ]}
                    labelFormatter={(label) => `Time: ${label}`}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-gray-300 shadow-md rounded">
                            <p className="font-bold">{`Time: ${label}`}</p>
                            {payload.map((entry, index) => {
                              const entryName = entry.name || "Unknown"
                              const parts = entryName.split(":")
                              const modelName = parts[0] || "Unknown"
                              const gameIdPart = parts[1] || "Unknown"

                              return (
                                <p key={index} style={{ color: entry.color }}>
                                  {`${modelName} (Game ${gameIdPart}): ${formatDollar(
                                    entry.value as number
                                  )}`}
                                </p>
                              )
                            })}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      if (!value) return "Unknown"
                      const valueParts = value.split(":")
                      const modelPart = valueParts[0] || "Unknown"
                      const gamePart = valueParts[1] || "Unknown"
                      return `${modelPart} (Game ${gamePart})`
                    }}
                  />
                  {uniqueModelGameCombos.map((combo, index) => (
                    <Line
                      key={combo}
                      type="monotone"
                      dataKey={combo}
                      name={combo}
                      stroke={lineColors[index % lineColors.length]}
                      strokeWidth={3} // Thicker lines
                      dot={{ r: 2 }}
                      activeDot={{ r: 6 }}
                      animationBegin={0}
                      animationDuration={2000}
                      animationEasing="ease-out"
                      isAnimationActive={animationActive}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Performance Metrics Table */}
        {chartView === "average" && calculatedChartData.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-lg overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Model Performance Metrics
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Model
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Average Balance
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Games Played
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculatedChartData.map((model, index) => (
                    <tr
                      key={model.modelName}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {model.modelName}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          model.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatDollar(model.profit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {model.gamesCount}
                        <span className="text-xs text-gray-400 ml-1">
                          ({model.balanceCount} data points)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
