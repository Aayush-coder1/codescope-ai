"use client";

import { motion } from "framer-motion";
import { Plus, Minus, FileCode, AlertTriangle, CheckCircle2, Clock, BarChart2 } from "lucide-react";
import { AnalysisResult } from "@/types";

interface StatsBarProps {
  data: AnalysisResult;
}

function MiniScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50">{label}</span>
        <span className="text-[10px] font-mono font-medium" style={{ color }}>{value}</span>
      </div>
      <div className="relative w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}30` }}
        />
      </div>
    </div>
  );
}

function formatTimeEstimate(data: AnalysisResult): string {
  const totalChanges = data.totalAdditions + data.totalDeletions;
  const criticalIssues = data.reviews.filter((r) => r.severity === "critical").length;
  const highIssues = data.reviews.filter((r) => r.severity === "high").length;
  const complexityWeight = (100 - data.complexityScore) / 100;
  const baseMinutes = Math.ceil(totalChanges / 15);
  const issueMinutes = criticalIssues * 25 + highIssues * 12;
  const complexityMinutes = Math.ceil(baseMinutes * complexityWeight);
  const totalMinutes = Math.max(15, baseMinutes + issueMinutes + complexityMinutes);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function StatsBar({ data }: StatsBarProps) {
  const quickFixes = data.reviews.filter((r) => r.effort === "quick").length;
  const stats = [
    {
      icon: <Plus className="w-4 h-4 text-green-400" />,
      label: "Additions",
      value: `+${data.totalAdditions}`,
      color: "text-green-400",
    },
    {
      icon: <Minus className="w-4 h-4 text-red-400" />,
      label: "Deletions",
      value: `-${data.totalDeletions}`,
      color: "text-red-400",
    },
    {
      icon: <FileCode className="w-4 h-4 text-blue-400" />,
      label: "Files",
      value: data.filesChanged.toString(),
      color: "text-blue-400",
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
      label: "Issues",
      value: data.reviews.length.toString(),
      color: "text-orange-400",
    },
    {
      icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
      label: "Quick Fixes",
      value: quickFixes.toString(),
      color: "text-green-400",
    },
    {
      icon: <Clock className="w-4 h-4 text-purple-400" />,
      label: "Estimated",
      value: formatTimeEstimate(data),
      color: "text-purple-400",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-5 h-full flex flex-col justify-between border border-white/[0.04]"
    >
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-default"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center">
              {stat.icon}
            </div>
            <span className={`text-lg font-bold tabular-nums tracking-tight ${stat.color}`}>
              {stat.value}
            </span>
            <span className="text-[10px] text-muted-foreground/50">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <MiniScore label="Security" value={data.securityScore} color="#22c55e" />
        <MiniScore label="Performance" value={data.performanceScore} color="#eab308" />
        <MiniScore label="Complexity" value={data.complexityScore} color="#f97316" />
        <MiniScore label="Maintainability" value={data.maintainabilityScore} color="#60a5fa" />
      </div>
    </motion.div>
  );
}
