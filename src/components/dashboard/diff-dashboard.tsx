"use client";

import { motion } from "framer-motion";
import { FileDiff, Plus, Minus, Shield, Cpu } from "lucide-react";
import type { DiffAnalysisResult } from "@/types";
import { RepoScoreRing } from "@/components/dashboard/repo-score-ring";
import { ReviewPriority } from "@/components/dashboard/review-priority";
import { SummaryCard } from "@/components/dashboard/summary-card";

export function DiffDashboard({ data }: { data: DiffAnalysisResult }) {
  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Row 1: Scores + Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <RepoScoreRing score={data.overallScore} label="Overall Score" />
        </div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="lg:col-span-1 glass rounded-2xl p-5 flex flex-col items-center justify-center border border-white/[0.04] hover:border-red-500/20 hover:bg-red-500/[0.03] transition-colors duration-300 cursor-default"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <span className="text-3xl font-bold tracking-tight">{data.securityScore}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Security</span>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="lg:col-span-1 glass rounded-2xl p-5 flex flex-col items-center justify-center border border-white/[0.04] hover:border-orange-500/20 hover:bg-orange-500/[0.03] transition-colors duration-300 cursor-default"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
            <Cpu className="w-5 h-5 text-orange-400" />
          </div>
          <span className="text-3xl font-bold tracking-tight">{data.complexityScore}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Complexity</span>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="lg:col-span-1 glass rounded-2xl p-5 flex flex-col items-center justify-center border border-white/[0.04] hover:border-blue-500/20 hover:bg-blue-500/[0.03] transition-colors duration-300 cursor-default"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <FileDiff className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-3xl font-bold tracking-tight">{data.totalFiles}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Files Changed</span>
        </motion.div>
      </motion.div>

      {/* Row 2: Summary */}
      <motion.div variants={fadeUp}>
        <SummaryCard summary={data.aiSummary || data.summary} />
      </motion.div>

      {/* Row 3: File Changes + Reviews */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Changed Files</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {data.files.map((file, i) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-white/80 truncate block">{file.path}</span>
                  <span className="text-muted-foreground text-[10px]">{file.language}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {file.securityIssues.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px]">
                      {file.securityIssues.length} sec
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-green-400">
                    <Plus className="w-3 h-3" />{file.additions}
                  </span>
                  <span className="flex items-center gap-0.5 text-red-400">
                    <Minus className="w-3 h-3" />{file.deletions}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <ReviewPriority reviews={data.reviews} />
        </div>
      </motion.div>
    </motion.div>
  );
}
