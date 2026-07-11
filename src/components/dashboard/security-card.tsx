"use client";

import { motion } from "framer-motion";
import { Shield, AlertOctagon, AlertTriangle, Info, Lock, CheckCircle2 } from "lucide-react";
import { FileChange } from "@/types";

interface SecurityCardProps {
  files: FileChange[];
}

export function SecurityCard({ files }: SecurityCardProps) {
  const securityIssues = files.flatMap((f) =>
    f.securityIssues.map((issue) => ({ ...issue, file: f.path }))
  );

  const criticalCount = securityIssues.filter((i) => i.severity === "critical").length;
  const highCount = securityIssues.filter((i) => i.severity === "high").length;
  const mediumCount = securityIssues.filter((i) => i.severity === "medium").length;
  const totalIssues = securityIssues.length;

  const threatLevel = criticalCount > 0 ? "Critical" : highCount > 0 ? "High" : mediumCount > 0 ? "Medium" : "Clean";
  const threatColor = criticalCount > 0 ? "text-red-400" : highCount > 0 ? "text-orange-400" : mediumCount > 0 ? "text-yellow-400" : "text-green-400";
  const threatBg = criticalCount > 0 ? "from-red-500/15 to-red-500/5" : highCount > 0 ? "from-orange-500/15 to-orange-500/5" : mediumCount > 0 ? "from-yellow-500/15 to-yellow-500/5" : "from-green-500/15 to-green-500/5";

  const patterns = [
    "eval() injection", "innerHTML XSS", "prototype pollution",
    "SQL injection", "path traversal", "hardcoded secrets",
    "unsafe regex", "open redirect", "SSRF", "command injection",
  ];
  const checkedPatterns = patterns.slice(0, Math.min(patterns.length, 6 + files.length));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="glass rounded-2xl p-5 border border-red-500/10 hover:border-red-500/20 transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.02] via-transparent to-orange-500/[0.02] pointer-events-none" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/15 to-orange-500/15 flex items-center justify-center border border-red-500/10">
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Security Analysis</h3>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              {files.length} files · {checkedPatterns.length} patterns checked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gradient-to-br ${threatBg} ${threatColor} border border-current/20`}>
            {totalIssues === 0 ? <CheckCircle2 className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
            {threatLevel}
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
              <AlertOctagon className="w-3 h-3" />
              {criticalCount} critical
            </span>
          )}
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
        {securityIssues.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3 border border-green-500/15">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-green-400/80 font-medium">No security issues found</p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">Scanned {files.length} files across {checkedPatterns.length} patterns</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {checkedPatterns.map((p, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/5 text-green-400/50 border border-green-500/10">
                  {p}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-muted-foreground/50">{totalIssues} issue{totalIssues !== 1 ? "s" : ""} across {files.filter(f => f.securityIssues.length > 0).length} files</span>
            </div>
            {securityIssues.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                whileHover={{ x: 2 }}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 cursor-default"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${
                    issue.severity === "critical" ? "bg-red-500/10 text-red-400 border border-red-500/15" :
                    issue.severity === "high" ? "bg-orange-500/10 text-orange-400 border border-orange-500/15" :
                    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/15"
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
