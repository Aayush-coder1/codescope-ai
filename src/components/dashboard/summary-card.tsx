"use client";

import { motion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";

interface SummaryCardProps {
  summary: string;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      whileHover={{ y: -1 }}
      className="glass rounded-2xl p-6 border border-blue-500/10 hover:border-blue-500/20 transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-purple-500/[0.03] pointer-events-none" />
      <div className="flex items-center gap-2.5 mb-4 relative z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 flex items-center justify-center border border-blue-500/10">
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="font-semibold text-sm">AI Summary</h3>
      </div>
      <p className="text-sm text-white/60 leading-relaxed relative z-10">{summary}</p>
    </motion.div>
  );
}
