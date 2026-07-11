"use client";

import { motion } from "framer-motion";
import { FileCode, Grid3x3 } from "lucide-react";
import { FileChange } from "@/types";

interface RiskHeatmapProps {
  files: FileChange[];
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case "critical": return "bg-red-500/15 border-red-500/25 hover:bg-red-500/25 hover:border-red-500/40";
    case "high": return "bg-orange-500/15 border-orange-500/25 hover:bg-orange-500/25 hover:border-orange-500/40";
    case "medium": return "bg-yellow-500/15 border-yellow-500/25 hover:bg-yellow-500/25 hover:border-yellow-500/40";
    default: return "bg-green-500/15 border-green-500/25 hover:bg-green-500/25 hover:border-green-500/40";
  }
}

function getRiskDotColor(risk: string): string {
  switch (risk) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    default: return "bg-green-500";
  }
}

function getRiskTextColor(risk: string): string {
  switch (risk) {
    case "critical": return "text-red-400";
    case "high": return "text-orange-400";
    case "medium": return "text-yellow-400";
    default: return "text-green-400";
  }
}

export function RiskHeatmap({ files }: RiskHeatmapProps) {
  const sortedFiles = [...files].sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return riskOrder[a.risk] - riskOrder[b.risk];
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass rounded-2xl p-5 border border-white/[0.04]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/15 to-rose-500/15 flex items-center justify-center border border-pink-500/10">
            <Grid3x3 className="w-4 h-4 text-pink-400" />
          </div>
          <h3 className="font-semibold text-sm">Risk Heatmap</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {["critical", "high", "medium", "low"].map((risk) => (
            <div key={risk} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getRiskDotColor(risk)}`} />
              <span className="capitalize text-muted-foreground/50">{risk}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sortedFiles.map((file, i) => (
          <motion.div
            key={file.path}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.04 }}
            whileHover={{ scale: 1.02 }}
            className={`rounded-xl border p-3 transition-all duration-200 cursor-default ${getRiskColor(file.risk)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-xs font-mono truncate text-white/80">{file.path.split("/").pop()}</span>
              </div>
              <span className={`text-[10px] font-medium capitalize shrink-0 px-1.5 py-0.5 rounded ${getRiskTextColor(file.risk)} bg-white/[0.03]`}>
                {file.risk}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground/50">
              <span className="text-green-400/70 font-mono">+{file.additions}</span>
              <span className="text-red-400/70 font-mono">-{file.deletions}</span>
              <span className="font-mono">{file.complexity}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${file.complexity}%` }}
                transition={{ duration: 1, delay: 0.8 + i * 0.05 }}
                className="h-full rounded-full"
                style={{
                  background: file.complexity > 80 ? "#ef4444" : file.complexity > 60 ? "#f97316" : file.complexity > 40 ? "#eab308" : "#22c55e",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
