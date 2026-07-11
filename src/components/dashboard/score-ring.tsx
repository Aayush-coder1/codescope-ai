"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-400 via-green-400 to-teal-400";
  if (score >= 60) return "from-yellow-400 via-amber-400 to-orange-400";
  if (score >= 40) return "from-orange-400 via-amber-400 to-yellow-400";
  return "from-red-400 via-rose-400 to-pink-400";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export function ScoreRing({ score, label, size = 160 }: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [mounted, setMounted] = useState(false);
  const color = getScoreColor(score);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setDisplayScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-2xl p-6 flex flex-col items-center justify-center h-full relative overflow-hidden group"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}08 0%, transparent 70%)`,
        }}
      />

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={`score-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="50%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
            <filter id={`score-glow-${label}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={8}
          />
          {/* Glow circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#score-glow-${label})`}
            opacity={0.3}
            style={{
              transition: "stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          {/* Score circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#score-gradient-${label})`}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>

        {/* Tick marks */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90 pointer-events-none">
          {Array.from({ length: 40 }, (_, i) => {
            const angle = (i / 40) * 360;
            const rad = (angle * Math.PI) / 180;
            const outerR = size / 2 - 2;
            const innerR = size / 2 - 6;
            return (
              <line
                key={i}
                x1={size / 2 + Math.cos(rad) * innerR}
                y1={size / 2 + Math.sin(rad) * innerR}
                x2={size / 2 + Math.cos(rad) * outerR}
                y2={size / 2 + Math.sin(rad) * outerR}
                stroke="rgba(255,255,255,0.04)"
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
            className="text-4xl font-bold tabular-nums tracking-tight"
            style={{ color }}
          >
            {displayScore}
          </motion.span>
          <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4 font-medium">{label}</p>
    </motion.div>
  );
}
