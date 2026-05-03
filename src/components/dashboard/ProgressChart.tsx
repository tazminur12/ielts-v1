"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface AttemptData {
  date: string;
  overall: number;
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
}

interface ProgressChartProps {
  attempts: AttemptData[];
  title?: string;
}

export function BandProgressChart({ attempts, title = "Band Score Progress" }: ProgressChartProps) {
  const data = attempts.map((a, idx) => ({
    name: `Test ${idx + 1}`,
    date: a.date,
    Overall: a.overall,
    Listening: a.listening ?? null,
    Reading: a.reading ?? null,
    Writing: a.writing ?? null,
    Speaking: a.speaking ?? null,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Line type="monotone" dataKey="Overall" stroke="#1a3a5c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Listening" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Reading" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Writing" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Speaking" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ModulePerformance {
  module: string;
  average: number;
  attempts: number;
}

interface ModulePerformanceChartProps {
  data: ModulePerformance[];
}

export function ModulePerformanceChart({ data }: ModulePerformanceChartProps) {
  const colors = {
    Listening: "#0ea5e9",
    Reading: "#10b981",
    Writing: "#f59e0b",
    Speaking: "#ef4444",
  };

  const chartData = data.map((item) => ({
    name: item.module,
    "Average Band": item.average,
    color: colors[item.module as keyof typeof colors] || "#64748b",
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Module-wise Performance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="Average Band" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Bar key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
