"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, AreaChart, Area, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface UsageDatum {
  date?: string
  users?: number
  sessions?: number
  journalEntries?: number
}

interface PieDatum {
  name?: string
  value?: number
  color?: string
}

interface ChartsProps {
  usageData: UsageDatum[]
  pieData: PieDatum[]
  type: "area" | "pie" | "line"
}

export function AdminCharts({ usageData, pieData, type }: ChartsProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </div>
      </div>
    )
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={usageData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="users"
            stackId="1"
            stroke="#4fd1c5"
            fill="#4fd1c5"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="sessions"
            stackId="1"
            stroke="#fbbf24"
            fill="#fbbf24"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="journalEntries"
            stackId="1"
            stroke="#f0f4f8"
            fill="#f0f4f8"
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={usageData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="sessions" stroke="#4fd1c5" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return null
}