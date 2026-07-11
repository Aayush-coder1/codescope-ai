import { GitHubFile, detectLanguage } from "./github";
import type {
  AnalysisResult,
  FileChange,
  SecurityIssue,
  PerformanceIssue,
  DependencyEdge,
  ReviewItem,
} from "@/types";

// ─── Security Pattern Detection ───

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  severity: SecurityIssue["severity"];
  description: string;
  suggestion: string;
}> = [
  {
    pattern: /eval\s*\(/g,
    type: "Code Injection",
    severity: "critical",
    description: "eval() executes arbitrary code — prime injection vector",
    suggestion: "Replace eval() with JSON.parse() or a safe evaluation library",
  },
  {
    pattern: /new\s+Function\s*\(/g,
    type: "Code Injection",
    severity: "critical",
    description: "Dynamic Function constructor allows code injection",
    suggestion: "Avoid dynamic function construction; use closures or strategy pattern",
  },
  {
    pattern: /innerHTML\s*=/g,
    type: "XSS",
    severity: "high",
    description: "Direct innerHTML assignment can enable XSS attacks",
    suggestion: "Use textContent, or sanitize with DOMPurify before setting innerHTML",
  },
  {
    pattern: /dangerouslySetInnerHTML/g,
    type: "XSS",
    severity: "high",
    description: "React dangerouslySetInnerHTML bypasses JSX escaping",
    suggestion: "Sanitize HTML content with DOMPurify before rendering",
  },
  {
    pattern: /document\.write\s*\(/g,
    type: "XSS",
    severity: "medium",
    description: "document.write() can inject content into the page",
    suggestion: "Use DOM manipulation methods (createElement, appendChild) instead",
  },
  {
    pattern: /\$\{.*\}.*(?:query|execute|exec)\s*\(/g,
    type: "SQL Injection",
    severity: "critical",
    description: "Template literal in SQL query — vulnerable to injection",
    suggestion: "Use parameterized queries or prepared statements",
  },
  {
    pattern: /(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]+['"]/gi,
    type: "Hardcoded Secret",
    severity: "critical",
    description: "Hardcoded credential detected in source code",
    suggestion: "Move secrets to environment variables or a secrets manager",
  },
  {
    pattern: /(?:console\.log|console\.debug|console\.warn)\s*\(\s*['"](?:password|token|secret)/gi,
    type: "Credential Leak",
    severity: "high",
    description: "Sensitive credential logged to console",
    suggestion: "Remove console.log statements that expose credentials",
  },
  {
    pattern: /(?:exec|spawn|execSync|spawnSync)\s*\(\s*['"`]/g,
    type: "Command Injection",
    severity: "high",
    description: "Shell command with hardcoded string — potential injection point",
    suggestion: "Validate and sanitize inputs before shell execution; use execFile with args array",
  },
  {
    pattern: /Math\.random\s*\(\)/g,
    type: "Weak Randomness",
    severity: "medium",
    description: "Math.random() is not cryptographically secure",
    suggestion: "Use crypto.getRandomValues() for security-sensitive randomness",
  },
  {
    pattern: /(?:Object\.assign|Spread)\s*\(\s*\{\s*\.\.\./g,
    type: "Prototype Pollution Risk",
    severity: "medium",
    description: "Object spread may introduce prototype pollution if source is untrusted",
    suggestion: "Validate input objects and use Object.create(null) for clean prototypes",
  },
  {
    pattern: /atob\s*\(/g,
    type: "Unsafe Deserialization",
    severity: "low",
    description: "atob() decodes Base64 without validation",
    suggestion: "Validate decoded content before use",
  },
];

// ─── Performance Pattern Detection ───

const PERF_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  impact: PerformanceIssue["impact"];
  description: string;
  suggestion: string;
}> = [
  {
    pattern: /(?:await|\.then\().*(?:await|\.then\().*(?:await|\.then\()/g,
    type: "Waterfall Requests",
    impact: "high",
    description: "Multiple sequential awaits create request waterfalls",
    suggestion: "Use Promise.all() or Promise.allSettled() for parallel execution",
  },
  {
    pattern: /\.map\s*\(\s*async/g,
    type: "N+1 Pattern",
    impact: "high",
    description: "Async operations inside .map() execute all promises concurrently without concurrency control",
    suggestion: "Use p-limit or similar for controlled concurrency, or batch requests",
  },
  {
    pattern: /JSON\.parse\s*\(\s*JSON\.stringify/g,
    type: "Deep Clone Inefficiency",
    impact: "medium",
    description: "JSON round-trip for deep cloning is slow for large objects",
    suggestion: "Use structuredClone() (modern runtimes) or lodash.cloneDeep()",
  },
  {
    pattern: /(?:for|while)\s*\(.*\{[^}]*\b(?:document|DOM|innerHTML)\b/g,
    type: "DOM Thrashing",
    impact: "high",
    description: "DOM manipulation inside loops causes layout thrashing",
    suggestion: "Batch DOM updates using DocumentFragment or requestAnimationFrame",
  },
  {
    pattern: /setInterval\s*\([^,]+,\s*(?:[0-9]|[1-9][0-9])\s*\)/g,
    type: "High-Frequency Timer",
    impact: "medium",
    description: "Timer firing faster than 100ms may cause performance issues",
    suggestion: "Use requestAnimationFrame for visual updates, or debounce/throttle callbacks",
  },
  {
    pattern: /new\s+RegExp\s*\(/g,
    type: "Dynamic Regex",
    impact: "low",
    description: "Dynamic regex creation can cause ReDoS vulnerabilities",
    suggestion: "Pre-compile regex patterns; validate input before constructing patterns",
  },
  {
    pattern: /(?:try\s*\{[\s\S]*?\}\s*catch\s*\(\s*\w*\s*\)\s*\{\s*\})/g,
    type: "Silent Error Swallowing",
    impact: "medium",
    description: "Empty catch block silently swallows errors",
    suggestion: "Log errors or handle them explicitly; never silently ignore exceptions",
  },
  {
    pattern: /(?:useState|useEffect)\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?fetch/g,
    type: "Uncontrolled Fetch",
    impact: "medium",
    description: "Fetch inside useEffect without cleanup may cause memory leaks",
    suggestion: "Use AbortController to cancel pending requests on unmount",
  },
];

// ─── Import/Dependency Extraction ───

function extractImports(code: string): string[] {
  const imports: string[] = [];

  // ES imports: import X from 'Y'
  const esImports = code.matchAll(
    /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
  );
  for (const match of esImports) {
    imports.push(match[1]);
  }

  // Dynamic imports: import('Y')
  const dynImports = code.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const match of dynImports) {
    imports.push(match[1]);
  }

  // CommonJS require
  const requires = code.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const match of requires) {
    imports.push(match[1]);
  }

  // Python imports
  const pyImports = code.matchAll(
    /(?:from\s+(\S+)\s+import|import\s+(\S+))/g
  );
  for (const match of pyImports) {
    imports.push(match[1] || match[2]);
  }

  return [...new Set(imports)];
}

// ─── Complexity Estimation ───

function estimateComplexity(code: string): number {
  let score = 10;

  // Count control flow structures
  const controlFlow =
    (code.match(/\b(?:if|else\s+if|elif|switch|case|for|while|do|catch|try|except)\b/g)
      ?.length || 0);
  score += controlFlow * 3;

  // Count functions
  const functions =
    (code.match(/\b(?:function|=>|def|fn|func|method)\b/g)?.length || 0);
  score += functions * 2;

  // Nesting depth (approximate by counting braces)
  let maxNesting = 0;
  let currentNesting = 0;
  for (const ch of code) {
    if (ch === "{" || ch === "(") {
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    } else if (ch === "}" || ch === ")") {
      currentNesting--;
    }
  }
  score += maxNesting * 4;

  // Lines of code
  const lines = code.split("\n").length;
  score += Math.floor(lines / 20);

  return Math.min(100, Math.max(5, score));
}

// ─── Main Analysis Engine ───

function analyzeFile(
  filename: string,
  patch: string | undefined,
  additions: number,
  deletions: number
): FileChange {
  const language = detectLanguage(filename);
  const code = patch || "";
  const fullCode = code;

  // Security analysis
  const securityIssues: SecurityIssue[] = [];
  for (const rule of SECURITY_PATTERNS) {
    const matches = fullCode.matchAll(
      new RegExp(rule.pattern.source, rule.pattern.flags)
    );
    for (const match of matches) {
      const lineNum =
        fullCode.substring(0, match.index).split("\n").length;
      securityIssues.push({
        type: rule.type,
        severity: rule.severity,
        line: lineNum,
        description: rule.description,
        suggestion: rule.suggestion,
      });
    }
  }

  // Performance analysis
  const performanceIssues: PerformanceIssue[] = [];
  for (const rule of PERF_PATTERNS) {
    const matches = fullCode.matchAll(
      new RegExp(rule.pattern.source, rule.pattern.flags)
    );
    for (const match of matches) {
      const lineNum =
        fullCode.substring(0, match.index).split("\n").length;
      performanceIssues.push({
        type: rule.type,
        impact: rule.impact,
        line: lineNum,
        description: rule.description,
        suggestion: rule.suggestion,
      });
    }
  }

  // Complexity
  const complexity = estimateComplexity(fullCode);

  // Risk assessment
  const changeSize = additions + deletions;
  const criticalCount = securityIssues.filter(
    (i) => i.severity === "critical"
  ).length;
  const highSecCount = securityIssues.filter(
    (i) => i.severity === "high"
  ).length;
  const highPerfCount = performanceIssues.filter(
    (i) => i.impact === "high"
  ).length;

  let risk: FileChange["risk"] = "low";
  if (criticalCount > 0 || (complexity > 85 && changeSize > 100)) {
    risk = "critical";
  } else if (highSecCount > 0 || highPerfCount > 0 || complexity > 70 || changeSize > 200) {
    risk = "high";
  } else if (complexity > 50 || changeSize > 50 || securityIssues.length > 0) {
    risk = "medium";
  }

  return {
    path: filename,
    additions,
    deletions,
    risk,
    language,
    complexity,
    securityIssues,
    performanceIssues,
  };
}

function buildDependencyEdges(
  files: FileChange[],
  allFiles: Map<string, string>
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const filePaths = files.map((f) => f.path);

  for (const file of files) {
    const code = allFiles.get(file.path) || "";
    const imports = extractImports(code);

    for (const imp of imports) {
      // Try to resolve import to a file in the changed set
      for (const candidate of filePaths) {
        if (candidate === file.path) continue;
        if (
          candidate.endsWith(imp) ||
          candidate.endsWith(imp + ".ts") ||
          candidate.endsWith(imp + ".tsx") ||
          candidate.endsWith(imp + ".js") ||
          candidate.endsWith(imp + ".jsx") ||
          candidate.endsWith(imp + "/index.ts") ||
          candidate.endsWith(imp + "/index.tsx") ||
          candidate.endsWith(imp + "/index.js")
        ) {
          edges.push({
            source: file.path,
            target: candidate,
            type: imp.startsWith(".") ? "import" : "require",
            weight: 2,
          });
        }
      }
    }
  }

  return edges;
}

function generateReviewItems(
  files: FileChange[],
  dependencies: DependencyEdge[]
): ReviewItem[] {
  const reviews: ReviewItem[] = [];
  let id = 1;

  // Collect all security issues
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
  }

  // Collect all performance issues
  for (const file of files) {
    for (const issue of file.performanceIssues) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "performance",
        severity: issue.impact === "high" ? "high" : issue.impact === "medium" ? "medium" : "low",
        file: file.path,
        line: issue.line,
        title: `${issue.type} in ${file.path.split("/").pop()}`,
        description: issue.description,
        suggestion: issue.suggestion,
        effort: issue.impact === "high" ? "moderate" : "quick",
      });
    }
  }

  // Complexity issues
  for (const file of files) {
    if (file.complexity > 70) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "complexity",
        severity: file.complexity > 85 ? "high" : "medium",
        file: file.path,
        title: `High complexity in ${file.path.split("/").pop()} (score: ${file.complexity})`,
        description: `This file has a cyclomatic complexity of ${file.complexity}. ${
          file.complexity > 85
            ? "This significantly impacts maintainability."
            : "Consider breaking it into smaller functions."
        }`,
        suggestion:
          "Extract helper functions, reduce nesting depth, and apply the Single Responsibility Principle.",
        effort: file.complexity > 85 ? "significant" : "moderate",
      });
    }
  }

  // Architecture issues — files with many dependencies
  const depCount = new Map<string, number>();
  for (const edge of dependencies) {
    depCount.set(edge.source, (depCount.get(edge.source) || 0) + 1);
  }
  for (const [file, count] of depCount) {
    if (count >= 3) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "architecture",
        severity: count >= 5 ? "high" : "medium",
        file,
        title: `High coupling in ${file.split("/").pop()} (${count} dependencies)`,
        description: `This file imports from ${count} changed files, suggesting tight coupling.`,
        suggestion:
          "Consider dependency injection, event-driven architecture, or shared abstractions.",
        effort: "significant",
      });
    }
  }

  // Sort by severity then category priority
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const categoryOrder = {
    security: 0,
    performance: 1,
    complexity: 2,
    architecture: 3,
    style: 4,
  };

  reviews.sort((a, b) => {
    const sevDiff =
      severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  // Re-assign priorities
  reviews.forEach((r, i) => (r.priority = i + 1));

  return reviews;
}

function calculateScores(
  files: FileChange[],
  reviews: ReviewItem[]
): {
  overall: number;
  complexity: number;
  security: number;
  performance: number;
  maintainability: number;
} {
  const totalFiles = files.length || 1;

  // Security score: start at 100, deduct for issues
  let security = 100;
  const secIssues = reviews.filter((r) => r.category === "security");
  for (const issue of secIssues) {
    if (issue.severity === "critical") security -= 20;
    else if (issue.severity === "high") security -= 10;
    else if (issue.severity === "medium") security -= 5;
    else security -= 2;
  }
  security = Math.max(0, Math.min(100, security));

  // Performance score: start at 100, deduct for issues
  let performance = 100;
  const perfIssues = reviews.filter((r) => r.category === "performance");
  for (const issue of perfIssues) {
    if (issue.severity === "high") performance -= 15;
    else if (issue.severity === "medium") performance -= 8;
    else performance -= 3;
  }
  performance = Math.max(0, Math.min(100, performance));

  // Complexity score: inverse of average file complexity
  const avgComplexity =
    files.reduce((sum, f) => sum + f.complexity, 0) / totalFiles;
  const complexity = Math.max(0, Math.min(100, 100 - avgComplexity + 20));

  // Maintainability: based on file count, complexity, and review effort
  const significantIssues = reviews.filter(
    (r) => r.effort === "significant"
  ).length;
  const maintainability = Math.max(
    20,
    Math.min(100, 85 - Math.min(significantIssues, 5) * 6 - (avgComplexity > 80 ? 12 : avgComplexity > 60 ? 5 : 0))
  );

  // Overall: weighted average
  const overall = Math.round(
    security * 0.3 + performance * 0.25 + complexity * 0.25 + maintainability * 0.2
  );

  return {
    overall: Math.round(overall),
    complexity: Math.round(complexity),
    security: Math.round(security),
    performance: Math.round(performance),
    maintainability: Math.round(maintainability),
  };
}

export function analyzePR(
  prTitle: string,
  prAuthor: string,
  repoName: string,
  prNumber: number,
  githubFiles: GitHubFile[],
  fileContents: Map<string, string>
): AnalysisResult {
  // Analyze each file
  const files: FileChange[] = githubFiles.map((gf) =>
    analyzeFile(gf.filename, gf.patch, gf.additions, gf.deletions)
  );

  // Build dependency graph from file contents
  const dependencies = buildDependencyEdges(files, fileContents);

  // Generate review items
  const reviews = generateReviewItems(files, dependencies);

  // Calculate scores
  const scores = calculateScores(files, reviews);

  // Calculate totals
  const totalAdditions = githubFiles.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = githubFiles.reduce((s, f) => s + f.deletions, 0);

  // Generate summary
  const criticalCount = reviews.filter(
    (r) => r.severity === "critical"
  ).length;
  const highCount = reviews.filter((r) => r.severity === "high").length;
  const quickFixes = reviews.filter((r) => r.effort === "quick").length;

  let summary = `Analyzed ${files.length} files with ${totalAdditions} additions and ${totalDeletions} deletions. `;
  if (criticalCount > 0) {
    summary += `${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} require${criticalCount === 1 ? "s" : ""} immediate attention. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high-severity issue${highCount > 1 ? "s" : ""} found. `;
  }
  if (quickFixes > 0) {
    summary += `${quickFixes} issue${quickFixes > 1 ? "s" : ""} can be fixed quickly. `;
  }

  const highRiskFiles = files.filter(
    (f) => f.risk === "critical" || f.risk === "high"
  );
  if (highRiskFiles.length > 0) {
    summary += `High-risk files: ${highRiskFiles.map((f) => f.path.split("/").pop()).join(", ")}. `;
  }

  if (criticalCount === 0 && highCount === 0) {
    summary += "No critical issues found. This PR looks solid. ";
  }

  return {
    id: `pr-${repoName}-${prNumber}-${Date.now()}`,
    type: "pr",
    repoName,
    prNumber,
    prTitle,
    prAuthor,
    overallScore: scores.overall,
    complexityScore: scores.complexity,
    securityScore: scores.security,
    performanceScore: scores.performance,
    maintainabilityScore: scores.maintainability,
    totalAdditions,
    totalDeletions,
    filesChanged: files.length,
    files,
    dependencies,
    reviews,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}
