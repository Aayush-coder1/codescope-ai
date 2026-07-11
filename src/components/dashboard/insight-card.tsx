"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, TrendingUp, ChevronDown } from "lucide-react";
import type { RepoInsight } from "@/types";

interface InsightCardProps {
  insight: RepoInsight;
  variant: "debt" | "strengths" | "weaknesses" | "improvements";
}

const VARIANTS = {
  debt: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-orange-400",
    bg: "from-orange-500/10 to-red-500/10",
    border: "border-orange-500/15",
    hoverBorder: "hover:border-orange-500/30",
    hoverBg: "hover:bg-orange-500/[0.03]",
    accent: "text-orange-400",
    dot: "bg-orange-400",
  },
  strengths: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-400",
    bg: "from-green-500/10 to-emerald-500/10",
    border: "border-green-500/15",
    hoverBorder: "hover:border-green-500/30",
    hoverBg: "hover:bg-green-500/[0.03]",
    accent: "text-green-400",
    dot: "bg-green-400",
  },
  weaknesses: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-400",
    bg: "from-red-500/10 to-pink-500/10",
    border: "border-red-500/15",
    hoverBorder: "hover:border-red-500/30",
    hoverBg: "hover:bg-red-500/[0.03]",
    accent: "text-red-400",
    dot: "bg-red-400",
  },
  improvements: {
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-blue-400",
    bg: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-500/15",
    hoverBorder: "hover:border-blue-500/30",
    hoverBg: "hover:bg-blue-500/[0.03]",
    accent: "text-blue-400",
    dot: "bg-blue-400",
  },
};

function parseContent(content: string): Array<{ title: string; body: string }> {
  const points: Array<{ title: string; body: string }> = [];
  const lines = content.split("\n");
  let current: { title: string; body: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect **Title** format (bold markdown)
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*:?\s*$/);
    // Detect "1. Title" or "- Title" format
    const numberedMatch = trimmed.match(/^[\d]+\.\s+\*?\*?(.+?)\*?\*?\s*:?\s*$/);
    const bulletMatch = trimmed.match(/^[-•]\s+\*?\*?(.+?)\*?\*?\s*:?\s*$/);

    const titleMatch = boldMatch || numberedMatch || bulletMatch;

    if (titleMatch) {
      if (current) points.push(current);
      current = { title: titleMatch[1].replace(/\*\*/g, "").trim(), body: "" };
    } else if (current) {
      // Append body text, stripping any remaining markdown
      const cleanLine = trimmed.replace(/\*\*/g, "").replace(/^[-•]\s*/, "");
      current.body += (current.body ? " " : "") + cleanLine;
    } else {
      // No title yet, treat as body
      current = { title: "", body: trimmed.replace(/\*\*/g, "") };
    }
  }
  if (current) points.push(current);

  return points;
}

function InsightContent({ content, accent, dot }: { content: string; accent: string; dot: string }) {
  const points = parseContent(content);

  // If no structured points, render as paragraph
  if (points.length <= 1 && !points[0]?.title) {
    return (
      <p className="text-[13px] leading-relaxed text-white/65">
        {content.replace(/\*\*/g, "")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {points.map((point, i) => (
        <div key={i} className="flex gap-2.5 group">
          <div className={`w-1.5 h-1.5 rounded-full ${dot} mt-[7px] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`} />
          <div className="flex-1 min-w-0">
            {point.title && (
              <p className={`text-[13px] font-semibold ${accent} leading-snug mb-0.5`}>
                {point.title}
              </p>
            )}
            {point.body && (
              <p className="text-[12px] leading-[1.6] text-white/55">
                {point.body}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsightCard({ insight, variant }: InsightCardProps) {
  const v = VARIANTS[variant];
  const [expanded, setExpanded] = useState(false);

  if (!insight.content) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass rounded-2xl p-5 border ${v.border} cursor-default`}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${v.bg} flex items-center justify-center ${v.color}`}>
            {v.icon}
          </div>
          <h3 className="text-sm font-semibold text-white/85">{insight.title}</h3>
        </div>
        <p className="text-xs text-white/25 italic">AI analysis pending...</p>
      </motion.div>
    );
  }

  const points = parseContent(insight.content);
  const hasMore = points.length > 2 || insight.content.length > 180;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`glass rounded-2xl p-5 border ${v.border} ${v.hoverBorder} ${v.hoverBg} transition-all duration-300 cursor-default`}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${v.bg} flex items-center justify-center ${v.color}`}>
          {v.icon}
        </div>
        <h3 className="text-sm font-semibold text-white/85">{insight.title}</h3>
      </div>

      <AnimatePresence mode="wait">
        {expanded || !hasMore ? (
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <InsightContent content={insight.content} accent={v.accent} dot={v.dot} />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative overflow-hidden max-h-[85px]">
              <InsightContent content={insight.content} accent={v.accent} dot={v.dot} />
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 mt-3 text-[11px] font-medium ${v.accent} hover:opacity-80 transition-opacity`}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </motion.div>
  );
}
