"use client";

import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, GitBranch, Clock, Loader2, Folder, FileDiff, GitPullRequest, Eye, Zap } from "lucide-react";
import Link from "next/link";
import { mockAnalysis } from "@/lib/mock-data";
import type { AnyAnalysisResult } from "@/types";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { SecurityCard } from "@/components/dashboard/security-card";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { ReviewPriority } from "@/components/dashboard/review-priority";
import { DependencyGraph } from "@/components/dashboard/dependency-graph";
import { RepoDashboard } from "@/components/dashboard/repo-dashboard";
import { DiffDashboard } from "@/components/dashboard/diff-dashboard";
import { Particles } from "@/components/ui/particles";

export default function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AnyAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalysis() {
      try {
        const res = await fetch(`/api/results?id=${id}`);
        const json = await res.json();
        if (json.result) {
          setData(json.result);
        } else {
          setError("Analysis not found. It may have expired.");
        }
      } catch {
        if (id === "demo-001") {
          setData(mockAnalysis);
        } else {
          setError("Failed to load analysis.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadAnalysis();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
        <Particles count={40} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            <div className="absolute inset-0 w-10 h-10 rounded-full bg-purple-500/20 blur-xl" />
          </div>
          <p className="text-sm text-muted-foreground/70">Analyzing code...</p>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full bg-purple-400"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
        <Particles count={40} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative z-10 glass rounded-2xl p-8 max-w-md mx-4"
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <p className="text-sm text-muted-foreground/70 mb-4">{error || "Analysis not found"}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/80 hover:text-white transition-all duration-200 border border-white/5"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to CodeScope AI
          </Link>
        </motion.div>
      </div>
    );
  }

  // Route to the correct dashboard based on analysis type
  const isRepo = data.type === "repo";
  const isDiff = data.type === "diff";
  const isPR = !isRepo && !isDiff;

  const typeIcon = isRepo ? <Folder className="w-4 h-4" /> : isDiff ? <FileDiff className="w-4 h-4" /> : <GitPullRequest className="w-4 h-4" />;
  const typeLabel = isRepo ? "Repository" : isDiff ? "Diff" : "Pull Request";

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg relative">
      <Particles count={50} />

      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50"
      >
        <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-xl border-b border-white/5" />
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-muted-foreground hover:text-white transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Eye className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold tracking-tight hidden sm:block">CodeScope AI</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-sm">
              <GitBranch className="w-4 h-4 text-muted-foreground/60" />
              <span className="text-muted-foreground/80 text-xs">{data.repoName}</span>
              {"prNumber" in data && (data as { prNumber?: number }).prNumber && (
                <span className="text-white font-semibold text-xs">#{(data as { prNumber: number }).prNumber}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5">
              {typeIcon}
              <span className="text-[11px]">{typeLabel}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{new Date(data.analyzedAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/[0.08] text-green-400/80 border border-green-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px]">Analyzed</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Info Banner */}
      {isPR && "prTitle" in data && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-500/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/10">
                <GitPullRequest className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">{(data as { prTitle: string }).prTitle}</h2>
                <p className="text-xs text-muted-foreground/60">
                  by <span className="text-white/70">{(data as { prAuthor: string }).prAuthor}</span> &middot; {(data as { filesChanged: number }).filesChanged} files changed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs relative z-10">
              <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-400 font-mono">+{(data as { totalAdditions: number }).totalAdditions}</span>
              <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 font-mono">-{(data as { totalDeletions: number }).totalDeletions}</span>
              <span className="px-2 py-1 rounded-lg bg-white/5 text-muted-foreground/60">{(data as { filesChanged: number }).filesChanged} files</span>
            </div>
          </motion.div>
        </div>
      )}

      {isRepo && "description" in data && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 flex items-center gap-4 border border-purple-500/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.03] via-transparent to-blue-500/[0.03] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/10 relative z-10">
              <Folder className="w-5 h-5 text-purple-400" />
            </div>
            <div className="relative z-10">
              <h2 className="font-semibold text-sm">Repository Analysis</h2>
              <p className="text-xs text-muted-foreground/60">{(data as { description: string }).description || "Full codebase intelligence"}</p>
            </div>
          </motion.div>
        </div>
      )}

      {isDiff && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 flex items-center gap-4 border border-orange-500/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.03] via-transparent to-red-500/[0.03] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center border border-orange-500/10 relative z-10">
              <FileDiff className="w-5 h-5 text-orange-400" />
            </div>
            <div className="relative z-10">
              <h2 className="font-semibold text-sm">Diff Analysis</h2>
              <p className="text-xs text-muted-foreground/60">{data.totalFiles} file{data.totalFiles !== 1 ? "s" : ""} analyzed</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dashboard Content */}
      {isRepo && "languages" in data && (
        <RepoDashboard data={data as import("@/types").RepositoryAnalysisResult} />
      )}

      {isDiff && "files" in data && "reviews" in data && !isRepo && !isPR && (
        <DiffDashboard data={data as import("@/types").DiffAnalysisResult} />
      )}

      {isPR && "files" in data && "reviews" in data && (
        <PRDashboard data={data as import("@/types").AnalysisResult} />
      )}

      {/* Footer */}
      <div className="max-w-[1600px] mx-auto px-6 py-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/30">
        <div className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
        CodeScope AI · Built for AMD Developer Hackathon ACT II
        <div className="w-1 h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
      </div>
    </div>
  );
}

function PRDashboard({ data }: { data: import("@/types").AnalysisResult }) {
  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.main variants={stagger} initial="hidden" animate="show" className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <ScoreRing score={data.overallScore} label="Overall Score" />
        </div>
        <div className="lg:col-span-3">
          <StatsBar data={data} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <SummaryCard summary={data.aiSummary || data.summary} />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SecurityCard files={data.files} />
        <PerformanceCard files={data.files} />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskHeatmap files={data.files} />
        </div>
        <div className="lg:col-span-1">
          <ReviewPriority reviews={data.reviews} />
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <DependencyGraph files={data.files} dependencies={data.dependencies} />
      </motion.div>
    </motion.main>
  );
}
