import { detectLanguage } from "./github";
import type {
  DiffAnalysisResult,
  DiffFile,
  DiffHunk,
  SecurityIssue,
  PerformanceIssue,
  ReviewItem,
} from "@/types";

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  severity: SecurityIssue["severity"];
  description: string;
  suggestion: string;
}> = [
  { pattern: /eval\s*\(/g, type: "Code Injection", severity: "critical", description: "eval() executes arbitrary code", suggestion: "Replace with JSON.parse() or safe evaluation" },
  { pattern: /innerHTML\s*=/g, type: "XSS", severity: "high", description: "Direct innerHTML can enable XSS", suggestion: "Use textContent or sanitize with DOMPurify" },
  { pattern: /dangerouslySetInnerHTML/g, type: "XSS", severity: "high", description: "Bypasses JSX escaping", suggestion: "Sanitize with DOMPurify" },
  { pattern: /\$\{.*\}.*(?:query|execute|exec)\s*\(/g, type: "SQL Injection", severity: "critical", description: "Template literal in SQL query", suggestion: "Use parameterized queries" },
  { pattern: /(?:password|secret|api_key|token)\s*[:=]\s*['"][^'"]+['"]/gi, type: "Hardcoded Secret", severity: "critical", description: "Hardcoded credential", suggestion: "Move to environment variables" },
  { pattern: /(?:exec|spawn)\s*\(\s*['"`]/g, type: "Command Injection", severity: "high", description: "Shell command with hardcoded string", suggestion: "Use execFile with args array" },
];

const PERF_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  impact: PerformanceIssue["impact"];
  description: string;
  suggestion: string;
}> = [
  { pattern: /(?:await|\.then\().*(?:await|\.then\().*(?:await|\.then\()/g, type: "Waterfall Requests", impact: "high", description: "Multiple sequential awaits", suggestion: "Use Promise.all() for parallel execution" },
  { pattern: /\.map\s*\(\s*async/g, type: "N+1 Pattern", impact: "high", description: "Async in .map() without concurrency control", suggestion: "Use p-limit for controlled concurrency" },
  { pattern: /JSON\.parse\s*\(\s*JSON\.stringify/g, type: "Deep Clone Inefficiency", impact: "medium", description: "JSON round-trip is slow", suggestion: "Use structuredClone() or lodash.cloneDeep()" },
  { pattern: /setInterval\s*\([^,]+,\s*(?:[0-9]|[1-9][0-9])\s*\)/g, type: "High-Frequency Timer", impact: "medium", description: "Timer faster than 100ms", suggestion: "Use requestAnimationFrame or debounce" },
  { pattern: /(?:try\s*\{[\s\S]*?\}\s*catch\s*\(\s*\w*\s*\)\s*\{\s*\})/g, type: "Silent Error Swallowing", impact: "medium", description: "Empty catch block", suggestion: "Log errors or handle explicitly" },
];

function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const headerMatch = block.match(/a\/(.+?)\s+b\/(.+)/);
    if (!headerMatch) continue;

    const filePath = headerMatch[2];
    const language = detectLanguage(filePath);

    const additions = (block.match(/^\+[^+]/gm) || []).length;
    const deletions = (block.match(/^-[^-]/gm) || []).length;

    const hunkRegex = /@@\s+-([\d,]+)\s+\+([\d,]+)\s+@@(.*)/g;
    const hunks: DiffHunk[] = [];
    let match;

    while ((match = hunkRegex.exec(block)) !== null) {
      const [oldStart, oldCount] = match[1].split(",").map(Number);
      const [newStart, newCount] = match[2].split(",").map(Number);
      const hunkStart = match.index + match[0].length;
      const nextHunk = block.indexOf("\n@@", hunkStart);
      const content = block.substring(hunkStart, nextHunk > -1 ? nextHunk : undefined);

      hunks.push({
        oldStart,
        oldLines: oldCount,
        newStart,
        newLines: newCount,
        content,
      });
    }

    const fullCode = hunks.map((h) => h.content).join("\n");

    const securityIssues: SecurityIssue[] = [];
    for (const rule of SECURITY_PATTERNS) {
      const matches = fullCode.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
      for (const m of matches) {
        const lineNum = fullCode.substring(0, m.index).split("\n").length;
        securityIssues.push({
          type: rule.type,
          severity: rule.severity,
          line: lineNum,
          description: rule.description,
          suggestion: rule.suggestion,
        });
      }
    }

    const performanceIssues: PerformanceIssue[] = [];
    for (const rule of PERF_PATTERNS) {
      const matches = fullCode.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
      for (const m of matches) {
        const lineNum = fullCode.substring(0, m.index).split("\n").length;
        performanceIssues.push({
          type: rule.type,
          impact: rule.impact,
          line: lineNum,
          description: rule.description,
          suggestion: rule.suggestion,
        });
      }
    }

    let complexity = 10;
    const controlFlow = (fullCode.match(/\b(?:if|else|for|while|switch|try|catch)\b/g)?.length || 0);
    complexity += controlFlow * 3;
    const funcs = (fullCode.match(/\b(?:function|=>|def|fn)\b/g)?.length || 0);
    complexity += funcs * 2;
    complexity = Math.min(100, complexity);

    let status = "modified";
    if (additions > 0 && deletions === 0) status = "added";
    else if (additions === 0 && deletions > 0) status = "deleted";

    files.push({
      path: filePath,
      status,
      additions,
      deletions,
      hunks,
      language,
      complexity,
      securityIssues,
      performanceIssues,
    });
  }

  return files;
}

function calculateDiffScores(files: DiffFile[], reviews: ReviewItem[]) {
  let security = 100;
  for (const file of files) {
    for (const issue of file.securityIssues) {
      if (issue.severity === "critical") security -= 20;
      else if (issue.severity === "high") security -= 10;
      else if (issue.severity === "medium") security -= 5;
    }
  }
  security = Math.max(0, Math.min(100, security));

  const avgComplexity = files.length > 0
    ? files.reduce((s, f) => s + f.complexity, 0) / files.length
    : 10;
  const complexity = Math.max(0, Math.min(100, 100 - avgComplexity + 20));

  const significantIssues = reviews.filter((r) => r.effort === "significant").length;
  const maintainability = Math.max(
    20,
    Math.min(100, 85 - Math.min(significantIssues, 5) * 6)
  );

  const overall = Math.round(security * 0.3 + complexity * 0.3 + maintainability * 0.4);

  return {
    overall: Math.round(overall),
    security: Math.round(security),
    complexity: Math.round(complexity),
    maintainability: Math.round(maintainability),
  };
}

function generateDiffReviews(files: DiffFile[]): ReviewItem[] {
  const reviews: ReviewItem[] = [];
  let id = 1;

  for (const file of files) {
    for (const issue of file.securityIssues) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "security",
        severity: issue.severity,
        file: file.path,
        line: issue.line,
        title: `${issue.type} in ${file.path.split("/").pop()}`,
        description: issue.description,
        suggestion: issue.suggestion,
        effort: issue.severity === "critical" ? "quick" : "moderate",
      });
    }
    for (const issue of file.performanceIssues) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "performance",
        severity: issue.impact === "high" ? "high" : "medium",
        file: file.path,
        line: issue.line,
        title: `${issue.type} in ${file.path.split("/").pop()}`,
        description: issue.description,
        suggestion: issue.suggestion,
        effort: issue.impact === "high" ? "moderate" : "quick",
      });
    }
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  reviews.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  reviews.forEach((r, i) => (r.priority = i + 1));

  return reviews;
}

export function analyzeDiff(diffText: string): DiffAnalysisResult {
  const files = parseDiff(diffText);
  const reviews = generateDiffReviews(files);
  const scores = calculateDiffScores(files, reviews);
  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);
  const criticalCount = reviews.filter((r) => r.severity === "critical").length;
  const highCount = reviews.filter((r) => r.severity === "high").length;

  let summary = `Analyzed ${files.length} file${files.length !== 1 ? "s" : ""} from diff with ${totalAdditions} additions and ${totalDeletions} deletions. `;
  if (criticalCount > 0) {
    summary += `${criticalCount} critical issue${criticalCount !== 1 ? "s" : ""} found. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high-severity issue${highCount !== 1 ? "s" : ""} found. `;
  }
  if (criticalCount === 0 && highCount === 0) {
    summary += "No critical issues found in this diff. ";
  }

  return {
    id: `diff-${Date.now()}`,
    type: "diff",
    repoName: "pasted-diff",
    overallScore: scores.overall,
    securityScore: scores.security,
    complexityScore: scores.complexity,
    maintainabilityScore: scores.maintainability,
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
    files,
    reviews,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}
