"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface RepoScoreRingProps {
  score: number;
  label: string;
  size?: number;
  color?: string;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export function RepoScoreRing({ score, label, size = 140, color }: RepoScoreRingProps) {
  const [currentScore, setCurrentScore] = useState(0);
  const [mounted, setMounted] = useState(false);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (currentScore / 100) * circumference;

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setCurrentScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s: number) => {
    if (color) return color;
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#eab308";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  const strokeColor = getColor(score);
  const gradientId = `repo-score-${label}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-2xl p-5 flex flex-col items-center justify-center h-full relative overflow-hidden group"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${strokeColor}08 0%, transparent 70%)`,
        }}
      />

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="50%" stopColor={strokeColor} stopOpacity="1" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.7" />
            </linearGradient>
            <filter id={`${gradientId}-glow`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor={strokeColor} floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={8}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
            filter={`url(#${gradientId}-glow)`}
          />
        </svg>

        {/* Tick marks */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90 pointer-events-none">
          {Array.from({ length: 30 }, (_, i) => {
            const angle = (i / 30) * 360;
            const rad = (angle * Math.PI) / 180;
            const outerR = size / 2 - 2;
            const innerR = size / 2 - 5;
            return (
              <line
                key={i}
                x1={size / 2 + Math.cos(rad) * innerR}
                y1={size / 2 + Math.sin(rad) * innerR}
                x2={size / 2 + Math.cos(rad) * outerR}
                y2={size / 2 + Math.sin(rad) * outerR}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth={1}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5, type: "spring" }}
            className="text-3xl font-bold tabular-nums tracking-tight"
            style={{ color: strokeColor }}
          >
            {currentScore}
          </motion.span>
          <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest mt-0.5">
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50 mt-3 font-medium">{label}</p>
    </motion.div>
  );
}
