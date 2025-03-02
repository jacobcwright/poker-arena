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
  Legend,
} from "recharts"
import Navbar from "../components/Navbar"

interface ModelProfit {
  winner_id?: string
  profit: number
  modelName: string
  gamesCount: number
}

interface ModelWins {
  model: string
  wins: number
  totalGames: number
  winRate: number
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
  const [winsData, setWinsData] = useState<ModelWins[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [chartView, setChartView] = useState<"average" | "wins">("average")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animationActive, setAnimationActive] = useState(false)

  // Colors for charts
  const barColors = [
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

        // Fetch average balance data
        const response = await fetch("/api/all-model-stats")
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        const result = await response.json()
        setData(result.data)

        // Also fetch wins data
        const winsResponse = await fetch("/api/model-wins")
        if (!winsResponse.ok) {
          throw new Error(`Error fetching wins data: ${winsResponse.status}`)
        }
        const winsResult = await winsResponse.json()
        setWinsData(winsResult.data)

        // Extract available models from wins data
        setAvailableModels(winsResult.data.map((item: ModelWins) => item.model))

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

  // Calculate average balances directly from data
  const calculateAveragesFromData = () => {
    if (data.length === 0) return []

    // Convert to array format for the bar chart
    return data
      .map((item) => ({
        modelName: item.modelName,
        name: item.modelName,
        profit: item.profit,
        gamesCount: item.gamesCount,
      }))
      .sort((a, b) => b.profit - a.profit) // Sort by profit descending
  }

  // Prepare the wins data for the chart
  const prepareWinsData = () => {
    if (winsData.length === 0) return []

    return winsData.map((item) => ({
      name: item.model,
      wins: item.wins,
      totalGames: item.totalGames,
      winRate: item.winRate,
    }))
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

  // Use calculated averages for the bar chart
  const calculatedChartData = calculateAveragesFromData()
  const winsChartData = prepareWinsData()

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
                  The <strong>Number of Wins</strong> chart shows how many games
                  each model has won. A win is defined as having the highest
                  balance at the end of a game.
                </p>
                <p className="mt-1">
                  All models are included in these stats, regardless of their
                  performance.
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
                chartView === "wins"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
              onClick={() => setChartView("wins")}
            >
              Number of Wins
            </button>
          </div>
        </div>

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
                      value="Average Balance"
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
                // Wins Chart
                <BarChart
                  data={winsChartData}
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
                  <YAxis width={60}>
                    <Label
                      value="Number of Wins"
                      position="left"
                      angle={-90}
                      offset={5}
                      style={{
                        textAnchor: "middle",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    />
                  </YAxis>
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "wins") {
                        return [value, "Wins"]
                      }
                      if (name === "winRate") {
                        return [`${value}%`, "Win Rate"]
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
                            <p>{`Wins: ${data.wins}`}</p>
                            <p>{`Total Games: ${data.totalGames}`}</p>
                            <p>{`Win Rate: ${data.winRate}%`}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="wins"
                    name="Wins"
                    fill="#82ca9d"
                    animationBegin={0}
                    animationDuration={2000}
                    animationEasing="ease-out"
                    isAnimationActive={animationActive}
                  />
                </BarChart>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wins Metrics Table */}
        {chartView === "wins" && winsChartData.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-lg overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Model Wins Metrics
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
                      Wins
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total Games
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Win Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {winsChartData.map((model, index) => (
                    <tr
                      key={model.name}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {model.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {model.wins}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {model.totalGames}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                        {model.winRate}%
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
