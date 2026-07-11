"use client";

import { motion } from "framer-motion";
import { Shield, Cpu, GitBranch, Layers, Folder, AlertTriangle, CheckCircle, TrendingUp, File, Lock } from "lucide-react";
import type { RepositoryAnalysisResult } from "@/types";
import { RepoScoreRing } from "@/components/dashboard/repo-score-ring";
import { LanguageBreakdown } from "@/components/dashboard/language-breakdown";
import { FolderStructure } from "@/components/dashboard/folder-structure";
import { InsightCard } from "@/components/dashboard/insight-card";
import { ReviewPriority } from "@/components/dashboard/review-priority";
import { DependencyGraph } from "@/components/dashboard/dependency-graph";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { SecurityCard } from "@/components/dashboard/security-card";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";

export function RepoDashboard({ data }: { data: RepositoryAnalysisResult }) {
  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const dimCards = [
    { icon: <Shield className="w-4 h-4" />, label: "Security", score: data.securityScore, color: "text-red-400" },
    { icon: <Cpu className="w-4 h-4" />, label: "Complexity", score: data.complexityScore, color: "text-orange-400" },
    { icon: <Layers className="w-4 h-4" />, label: "Maintainability", score: data.maintainabilityScore, color: "text-blue-400" },
    { icon: <GitBranch className="w-4 h-4" />, label: "Architecture", score: data.architectureScore, color: "text-purple-400" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Row 1: Scores */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1">
          <RepoScoreRing score={data.overallScore} label="Overall Score" />
        </div>
        {dimCards.map((dim, i) => (
          <motion.div
            key={dim.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            whileHover={{ scale: 1.03, y: -3 }}
            className="glass rounded-2xl p-5 flex flex-col items-center justify-center border border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-300 cursor-default group"
          >
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 ${dim.color} group-hover:scale-110 transition-transform duration-300`}>
              {dim.icon}
            </div>
            <span className="text-3xl font-bold tracking-tight">{dim.score}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{dim.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Row 2: Stats Bar */}
      <motion.div variants={fadeUp}>
        <StatsBar data={data as any} />
      </motion.div>

      {/* Row 3: AI Summary */}
      <motion.div variants={fadeUp}>
        <SummaryCard summary={data.aiSummary || data.summary} />
      </motion.div>

      {/* Row 4: Security + Performance */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SecurityCard files={data.files} />
        <PerformanceCard files={data.files} />
      </motion.div>

      {/* Row 5: Risk Heatmap + Review Priority */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskHeatmap files={data.files} />
        </div>
        <div className="lg:col-span-1">
          <ReviewPriority reviews={data.reviews} />
        </div>
      </motion.div>

      {/* Row 6: Languages + Folder Structure */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LanguageBreakdown languages={data.languages} />
        <FolderStructure tree={data.folderStructure} />
      </motion.div>

      {/* Row 7: Insights Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InsightCard insight={data.strengths} variant="strengths" />
        <InsightCard insight={data.weaknesses} variant="weaknesses" />
        <InsightCard insight={data.technicalDebt} variant="debt" />
        <InsightCard insight={data.suggestedImprovements} variant="improvements" />
      </motion.div>

      {/* Row 8: Security Findings + Dependency Graph */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold">Security Findings</h3>
            </div>
            {data.securityIssues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                No security issues found
              </div>
            ) : (
              <div className="space-y-2">
                {data.securityIssues.slice(0, 10).map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${
                      issue.severity === "critical" ? "text-red-400" :
                      issue.severity === "high" ? "text-orange-400" :
                      issue.severity === "medium" ? "text-yellow-400" : "text-gray-400"
                    }`} />
                    <div>
                      <span className="text-white/80">{issue.type}</span>
                      <span className="text-muted-foreground ml-1">in {issue.description.substring(0, 60)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          {data.dependencies.length > 0 ? (
            <DependencyGraph
              files={[...new Set(data.dependencies.flatMap((d) => [d.source, d.target]))].map((path) => ({
                path,
                additions: 0,
                deletions: 0,
                risk: "low" as const,
                language: "Unknown",
                complexity: 0,
                securityIssues: [],
                performanceIssues: [],
              }))}
              dependencies={data.dependencies}
            />
          ) : (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold">Dependency Graph</h3>
              </div>
              <div className="h-[350px] rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-center">
                <div className="text-center">
                  <GitBranch className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">No cross-file dependencies detected</p>
                  <p className="text-[10px] text-muted-foreground/25 mt-1">Import relationships between analyzed files will appear here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Row 9: Priority Reviews */}
      <motion.div variants={fadeUp}>
        <ReviewPriority reviews={data.reviews} />
      </motion.div>
    </motion.div>
  );
}