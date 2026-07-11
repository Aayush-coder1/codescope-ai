"use client";

import { motion } from "framer-motion";
import { Zap, AlertTriangle, Info, Gauge, CheckCircle2, Timer, TrendingDown } from "lucide-react";
import { FileChange } from "@/types";

interface PerformanceCardProps {
  files: FileChange[];
}

export function PerformanceCard({ files }: PerformanceCardProps) {
  const perfIssues = files.flatMap((f) =>
    f.performanceIssues.map((issue) => ({ ...issue, file: f.path }))
  );

  const highCount = perfIssues.filter((i) => i.impact === "high").length;
  const mediumCount = perfIssues.filter((i) => i.impact === "medium").length;
  const lowCount = perfIssues.filter((i) => i.impact === "low").length;
  const totalIssues = perfIssues.length;

  const impactLevel = highCount > 0 ? "High" : mediumCount > 0 ? "Medium" : lowCount > 0 ? "Low" : "Optimal";
  const impactColor = highCount > 0 ? "text-orange-400" : mediumCount > 0 ? "text-yellow-400" : lowCount > 0 ? "text-blue-400" : "text-green-400";
  const impactBg = highCount > 0 ? "from-orange-500/15 to-orange-500/5" : mediumCount > 0 ? "from-yellow-500/15 to-yellow-500/5" : lowCount > 0 ? "from-blue-500/15 to-blue-500/5" : "from-green-500/15 to-green-500/5";

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const avgComplexity = files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.complexity, 0) / files.length) : 0;

  const checks = [
    { label: "Memory leaks", icon: <TrendingDown className="w-3 h-3" /> },
    { label: "Render loops", icon: <Timer className="w-3 h-3" /> },
    { label: "Bundle size", icon: <Zap className="w-3 h-3" /> },
    { label: "N+1 queries", icon: <Gauge className="w-3 h-3" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48 }}
      className="glass rounded-2xl p-5 border border-amber-500/10 hover:border-amber-500/20 transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-yellow-500/[0.02] pointer-events-none" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/15 flex items-center justify-center border border-amber-500/10">
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Performance Impact</h3>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              {files.length} files · avg complexity {avgComplexity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gradient-to-br ${impactBg} ${impactColor} border border-current/20`}>
            {totalIssues === 0 ? <CheckCircle2 className="w-3 h-3" /> : <Gauge className="w-3 h-3" />}
            {impactLevel}
          </span>
          {highCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {highCount} high
            </span>
          )}
          {mediumCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
              <Info className="w-3 h-3" />
              {mediumCount} medium
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        {perfIssues.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3 border border-green-500/15">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-green-400/80 font-medium">No performance issues found</p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">All {files.length} files pass performance checks</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {checks.map((c, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-green-500/5 text-green-400/50 border border-green-500/10">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground/50">{totalIssues} issue{totalIssues !== 1 ? "s" : ""} affecting {files.filter(f => f.performanceIssues.length > 0).length} files</span>
            </div>
            {perfIssues.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.05 }}
                whileHover={{ x: 2 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 cursor-default"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${
                    issue.impact === "high" ? "bg-orange-500/10 text-orange-400 border border-orange-500/15" :
                    issue.impact === "medium" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/15" :
                    "bg-green-500/10 text-green-400 border border-green-500/15"
                  }`}>
                    {issue.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {issue.file.split("/").pop()}:{issue.line}
                  </span>
                </div>
                <p className="text-xs text-white/70 mb-1.5">{issue.description}</p>
                <p className="text-[10px] text-green-400/70 flex items-center gap-1">
                  <span className="text-green-400/40">→</span> {issue.suggestion}
                </p>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}
