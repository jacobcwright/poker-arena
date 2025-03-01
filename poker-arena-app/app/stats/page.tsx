"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

interface WinnerProfit {
  winner_id: string;
  profit: number;
  modelName: string;
}

// Format number as USD currency
const formatDollar = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function StatsPage() {
  const [data, setData] = useState<WinnerProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationActive, setAnimationActive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/game-stats");

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const result = await response.json();
        setData(result.data);

        // Trigger animation after data is loaded
        setTimeout(() => {
          setAnimationActive(true);
        }, 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading data: {error}</p>
        </div>
      </div>
    );
  }

  // Create custom data with model names as labels
  const chartData = data.map((item) => ({
    ...item,
    name: item.modelName, // Use model name as the display name
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Maximum Profit per Model
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 80, // Increased left margin for y-axis label
                bottom: 80, // Increased bottom margin for x-axis label
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
                  value="Profit"
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
                formatter={(value) => [formatDollar(value as number), "Profit"]}
                labelFormatter={(label) => `Model: ${label}`}
              />
              <Bar
                dataKey="profit"
                name="Profit"
                fill="#8884d8"
                animationBegin={0}
                animationDuration={2000}
                animationEasing="ease-out"
                isAnimationActive={animationActive}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
