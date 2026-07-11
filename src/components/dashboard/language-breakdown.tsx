"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import type { LanguageStat } from "@/types";

interface LanguageBreakdownProps {
  languages: LanguageStat[];
}

export function LanguageBreakdown({ languages }: LanguageBreakdownProps) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/[0.04]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center border border-violet-500/10">
          <BarChart3 className="w-4 h-4 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold">Language Breakdown</h3>
      </div>
      <div className="space-y-3.5">
        {languages.slice(0, 10).map((lang, i) => (
          <motion.div
            key={lang.language}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-md"
                  style={{ backgroundColor: lang.color, boxShadow: `0 0 8px ${lang.color}30` }}
                />
                <span className="text-white/70 font-medium">{lang.language}</span>
              </div>
              <span className="text-muted-foreground/50 font-mono text-[11px]">{lang.percentage}%</span>
            </div>
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lang.percentage}%` }}
                transition={{ duration: 1, delay: i * 0.05, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: lang.color, boxShadow: `0 0 12px ${lang.color}40` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
