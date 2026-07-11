"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Layers, Palette, AlertTriangle, ListOrdered } from "lucide-react";
import { ReviewItem } from "@/types";

interface ReviewPriorityProps {
  reviews: ReviewItem[];
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "security": return <Shield className="w-3.5 h-3.5" />;
    case "performance": return <Zap className="w-3.5 h-3.5" />;
    case "complexity": return <Layers className="w-3.5 h-3.5" />;
    case "architecture": return <Palette className="w-3.5 h-3.5" />;
    default: return <AlertTriangle className="w-3.5 h-3.5" />;
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-400 bg-red-500/10 border-red-500/20";
    case "high": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    case "medium": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    default: return "text-green-400 bg-green-500/10 border-green-500/20";
  }
}

function getEffortBadge(effort: string): string {
  switch (effort) {
    case "quick": return "text-green-400 bg-green-500/10 border border-green-500/15";
    case "moderate": return "text-yellow-400 bg-yellow-500/10 border border-yellow-500/15";
    default: return "text-red-400 bg-red-500/10 border border-red-500/15";
  }
}

export function ReviewPriority({ reviews }: ReviewPriorityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass rounded-2xl p-5 h-full flex flex-col border border-white/[0.04]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/15 to-blue-500/15 flex items-center justify-center border border-purple-500/10">
            <ListOrdered className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-semibold text-sm">Review Priority</h3>
        </div>
        <span className="text-[10px] text-muted-foreground/50 px-2 py-1 rounded-lg bg-white/[0.03]">{reviews.length} issues</span>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto max-h-[400px] pr-1 scrollbar-thin">
        {reviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.05 }}
            whileHover={{ x: 2 }}
            className="group rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 cursor-default"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/40 w-5">
                  #{review.priority}
                </span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border ${getSeverityColor(review.severity)}`}>
                  {getCategoryIcon(review.category)}
                  <span className="capitalize font-medium">{review.category}</span>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded-lg text-[9px] font-medium ${getEffortBadge(review.effort)}`}>
                {review.effort}
              </div>
            </div>

            <p className="text-xs font-medium text-white/80 mb-1.5 leading-snug ml-7">
              {review.title}
            </p>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 ml-7">
              <span className="font-mono">{review.file.split("/").pop()}</span>
              {review.line && <span>:{review.line}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
