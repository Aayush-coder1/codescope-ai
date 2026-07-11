import { detectLanguage, getLanguageColor, type GitHubRepoInfo, type GitHubLanguageStat, type GitHubTreeItem } from "./github";
import type {
  RepositoryAnalysisResult,
  RepoFile,
  FolderNode,
  LanguageStat,
  DependencyEdge,
  ReviewItem,
  SecurityIssue,
  RepoInsight,
  FileChange,
} from "@/types";

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  severity: SecurityIssue["severity"];
  description: string;
  suggestion: string;
}> = [
  { pattern: /eval\s*\(/g, type: "Code Injection", severity: "critical", description: "eval() executes arbitrary code", suggestion: "Replace with JSON.parse() or safe evaluation" },
  { pattern: /new\s+Function\s*\(/g, type: "Code Injection", severity: "critical", description: "Dynamic Function constructor allows injection", suggestion: "Use closures or strategy pattern" },
  { pattern: /innerHTML\s*=/g, type: "XSS", severity: "high", description: "Direct innerHTML assignment can enable XSS", suggestion: "Use textContent or sanitize with DOMPurify" },
  { pattern: /dangerouslySetInnerHTML/g, type: "XSS", severity: "high", description: "Bypasses JSX escaping", suggestion: "Sanitize with DOMPurify before rendering" },
  { pattern: /\$\{.*\}.*(?:query|execute|exec)\s*\(/g, type: "SQL Injection", severity: "critical", description: "Template literal in SQL query", suggestion: "Use parameterized queries" },
  { pattern: /(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]+['"]/gi, type: "Hardcoded Secret", severity: "critical", description: "Hardcoded credential detected", suggestion: "Move to environment variables" },
  { pattern: /(?:exec|spawn|execSync)\s*\(\s*['"`]/g, type: "Command Injection", severity: "high", description: "Shell command with hardcoded string", suggestion: "Use execFile with args array" },
  { pattern: /Math\.random\s*\(\)/g, type: "Weak Randomness", severity: "medium", description: "Not cryptographically secure", suggestion: "Use crypto.getRandomValues()" },
];

function extractImports(code: string): string[] {
  const imports: string[] = [];
  for (const match of code.matchAll(/import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g)) {
    imports.push(match[1]);
  }
  for (const match of code.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.push(match[1]);
  }
  for (const match of code.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.push(match[1]);
  }
  return [...new Set(imports)];
}

function estimateComplexity(code: string): number {
  let score = 10;
  const controlFlow = (code.match(/\b(?:if|else\s+if|elif|switch|case|for|while|do|catch|try|except)\b/g)?.length || 0);
  score += controlFlow * 3;
  const functions = (code.match(/\b(?:function|=>|def|fn|func|method)\b/g)?.length || 0);
  score += functions * 2;
  let maxNesting = 0;
  let currentNesting = 0;
  for (const ch of code) {
    if (ch === "{" || ch === "(") { currentNesting++; maxNesting = Math.max(maxNesting, currentNesting); }
    else if (ch === "}" || ch === ")") { currentNesting--; }
  }
  score += maxNesting * 4;
  const lines = code.split("\n").length;
  score += Math.floor(lines / 20);
  return Math.min(100, Math.max(5, score));
}

function buildFolderTree(files: GitHubTreeItem[]): FolderNode {
  const root: FolderNode = { name: "/", path: "", type: "folder", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (!current.children) current.children = [];

      let existing = current.children.find((c) => c.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isFile ? "file" : "folder",
          language: isFile ? detectLanguage(part) : undefined,
          size: isFile ? file.size : undefined,
        };
        current.children.push(existing);
      }

      if (!isFile) current = existing;
    }
  }

  // Sort: folders first, then files, alphabetically
  function sortTree(node: FolderNode) {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    }
  }
  sortTree(root);

  return root;
}

function buildDependencyGraph(
  files: RepoFile[],
  fileContents: Map<string, string>
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const paths = files.map((f) => f.path);
  const seen = new Set<string>();

  for (const file of files) {
    const code = fileContents.get(file.path) || "";
    if (!code) continue;
    const imports = extractImports(code);
    const fileDir = file.path.substring(0, file.path.lastIndexOf("/"));

    for (const imp of imports) {
      for (const candidate of paths) {
        if (candidate === file.path) continue;

        let matches = false;

        // Relative imports: ./foo or ../foo
        if (imp.startsWith(".")) {
          const resolved = (fileDir ? fileDir + "/" : "") + imp;
          const normalizedResolved = resolved.replace(/\/+/g, "/");
          matches =
            candidate === normalizedResolved ||
            candidate === normalizedResolved + ".ts" ||
            candidate === normalizedResolved + ".tsx" ||
            candidate === normalizedResolved + ".js" ||
            candidate === normalizedResolved + ".jsx" ||
            candidate === normalizedResolved + "/index.ts" ||
            candidate === normalizedResolved + "/index.js";
        }
        // Absolute/alias imports: @/lib/foo, /src/foo
        else if (imp.startsWith("@/") || imp.startsWith("/")) {
          const clean = imp.startsWith("@/") ? imp.slice(2) : imp.slice(1);
          matches =
            candidate.endsWith("/" + clean) ||
            candidate.endsWith("/" + clean + ".ts") ||
            candidate.endsWith("/" + clean + ".tsx") ||
            candidate.endsWith("/" + clean + ".js") ||
            candidate.endsWith("/" + clean + "/index.ts") ||
            candidate.endsWith("/" + clean + "/index.js");
        }
        // Package-like imports: check if candidate path contains the import name
        else {
          const parts = imp.split("/");
          const name = parts[parts.length - 1];
          matches =
            candidate.includes("/" + name + ".") ||
            candidate.endsWith("/" + name + "/index.ts") ||
            candidate.endsWith("/" + name + "/index.js");
        }

        if (matches) {
          const key = `${file.path}->${candidate}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({
              source: file.path,
              target: candidate,
              type: imp.startsWith(".") ? "import" : imp.startsWith("@") ? "require" : "import",
              weight: 2,
            });
          }
        }
      }
    }
  }

  return edges;
}

function analyzeRepoFiles(
  tree: GitHubTreeItem[],
  fileContents: Map<string, string>
): {
  files: RepoFile[];
  fileChanges: FileChange[];
  securityIssues: SecurityIssue[];
  reviews: ReviewItem[];
  avgComplexity: number;
  totalAdditions: number;
  totalDeletions: number;
} {
  const files: RepoFile[] = tree.map((item) => ({
    path: item.path,
    size: item.size || 0,
    language: detectLanguage(item.path),
  }));

  const fileChanges: FileChange[] = [];
  const allSecurityIssues: SecurityIssue[] = [];
  const reviews: ReviewItem[] = [];
  let id = 1;
  let totalComplexity = 0;
  let fileCount = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const [path, code] of fileContents) {
    const issues: SecurityIssue[] = [];
    for (const rule of SECURITY_PATTERNS) {
      const matches = code.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
      for (const match of matches) {
        const lineNum = code.substring(0, match.index).split("\n").length;
        issues.push({
          type: rule.type,
          severity: rule.severity,
          line: lineNum,
          description: rule.description,
          suggestion: rule.suggestion,
        });
      }
    }
    allSecurityIssues.push(...issues);

    for (const issue of issues) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "security",
        severity: issue.severity,
        file: path,
        line: issue.line,
        title: `${issue.type} in ${path.split("/").pop()}`,
        description: issue.description,
        suggestion: issue.suggestion,
        effort: issue.severity === "critical" ? "quick" : "moderate",
      });
    }

    const complexity = estimateComplexity(code);
    totalComplexity += complexity;
    fileCount++;

    // Simulate additions/deletions based on file size and complexity
    const lines = code.split("\n").length;
    const estimatedAdditions = Math.floor(lines * 0.3) + Math.floor(complexity / 5);
    const estimatedDeletions = Math.floor(lines * 0.1);
    totalAdditions += estimatedAdditions;
    totalDeletions += estimatedDeletions;

    const risk = issues.some((i) => i.severity === "critical") ? "critical" :
                 issues.some((i) => i.severity === "high") ? "high" :
                 issues.some((i) => i.severity === "medium") ? "medium" : "low";

    fileChanges.push({
      path,
      additions: estimatedAdditions,
      deletions: estimatedDeletions,
      risk,
      language: detectLanguage(path),
      complexity,
      securityIssues: issues,
      performanceIssues: [], // Repo analysis doesn't do perf issues
    });

    if (complexity > 70) {
      reviews.push({
        id: `r${id++}`,
        priority: id,
        category: "complexity",
        severity: complexity > 85 ? "high" : "medium",
        file: path,
        title: `High complexity in ${path.split("/").pop()} (${complexity})`,
        description: `Cyclomatic complexity of ${complexity}. ${complexity > 85 ? "Significantly impacts maintainability." : "Consider breaking into smaller functions."}`,
        suggestion: "Extract helpers, reduce nesting, apply Single Responsibility Principle.",
        effort: complexity > 85 ? "significant" : "moderate",
      });
    }
  }

  const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 20;

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const categoryOrder = { security: 0, performance: 1, complexity: 2, architecture: 3, style: 4 };
  reviews.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });
  reviews.forEach((r, i) => (r.priority = i + 1));

  return { files, fileChanges, securityIssues: allSecurityIssues, reviews, avgComplexity, totalAdditions, totalDeletions };
}

function calculateRepoScores(
  securityIssues: SecurityIssue[],
  avgComplexity: number,
  reviews: ReviewItem[],
  totalFiles: number
) {
  let security = 100;
  for (const issue of securityIssues) {
    if (issue.severity === "critical") security -= 20;
    else if (issue.severity === "high") security -= 10;
    else if (issue.severity === "medium") security -= 5;
    else security -= 2;
  }
  security = Math.max(0, Math.min(100, security));

  const complexity = Math.max(0, Math.min(100, 100 - avgComplexity + 20));

  const significantIssues = reviews.filter((r) => r.effort === "significant").length;
  const maintainability = Math.max(
    20,
    Math.min(100, 85 - Math.min(significantIssues, 5) * 6 - (avgComplexity > 80 ? 12 : avgComplexity > 60 ? 5 : 0))
  );

  const architecture = Math.max(
    30,
    Math.min(100, 80 - Math.min(totalFiles, 100) * 0.15 - significantIssues * 5)
  );

  const overall = Math.round(
    security * 0.3 + complexity * 0.25 + maintainability * 0.25 + architecture * 0.2
  );

  return {
    overall: Math.round(overall),
    security: Math.round(security),
    complexity: Math.round(complexity),
    maintainability: Math.round(maintainability),
    architecture: Math.round(architecture),
  };
}

function buildLanguageStats(
  languages: GitHubLanguageStat,
  totalSize: number
): LanguageStat[] {
  const total = Object.values(languages).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(languages)
    .map(([lang, bytes]) => ({
      language: lang,
      files: 0,
      bytes,
      percentage: Math.round((bytes / total) * 100 * 10) / 10,
      color: getLanguageColor(lang),
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15);
}

function generateStaticSummary(
  repoName: string,
  description: string,
  languages: LanguageStat[],
  totalFiles: number,
  securityIssues: SecurityIssue[],
  avgComplexity: number,
  scores: ReturnType<typeof calculateRepoScores>
): string {
  const primaryLang = languages[0]?.language || "Unknown";
  const issueCount = securityIssues.length;
  const criticalCount = securityIssues.filter((i) => i.severity === "critical").length;

  let s = `${repoName} is a ${primaryLang} project`;
  if (description) s += ` — "${description.substring(0, 120)}"`;
  s += `. Analyzed ${totalFiles} files with ${languages.length} languages. `;

  if (criticalCount > 0) {
    s += `${criticalCount} critical security issue${criticalCount > 1 ? "s" : ""} require immediate attention. `;
  } else if (issueCount > 0) {
    s += `${issueCount} security finding${issueCount > 1 ? "s" : ""} detected. `;
  } else {
    s += "No critical security issues found. ";
  }

  if (avgComplexity > 70) {
    s += `Average complexity is high (${Math.round(avgComplexity)}), suggesting the codebase could benefit from refactoring. `;
  } else {
    s += `Complexity is manageable (avg: ${Math.round(avgComplexity)}). `;
  }

  s += `Overall quality score: ${scores.overall}/100.`;
  return s;
}

function generateStaticInsights(
  repoInfo: GitHubRepoInfo,
  languages: LanguageStat[],
  securityIssues: SecurityIssue[],
  reviews: ReviewItem[],
  scores: ReturnType<typeof calculateRepoScores>,
  totalFiles: number,
  avgComplexity: number,
  dependencies: DependencyEdge[]
): { technicalDebt: RepoInsight; strengths: RepoInsight; weaknesses: RepoInsight; suggestedImprovements: RepoInsight } {
  const primaryLang = languages[0]?.language || "Unknown";
  const critCount = securityIssues.filter((i) => i.severity === "critical").length;
  const highCount = securityIssues.filter((i) => i.severity === "high").length;
  const complexityReviews = reviews.filter((r) => r.category === "complexity");
  const secReviews = reviews.filter((r) => r.category === "security");

  const strengths: string[] = [];
  if (scores.security >= 80) strengths.push(`Strong security posture (${scores.security}/100) with ${critCount === 0 ? "no critical vulnerabilities" : "few critical issues"}.`);
  if (scores.complexity >= 70) strengths.push(`Well-managed complexity (score: ${scores.complexity}/100) across ${totalFiles} files.`);
  if (languages.length > 1) strengths.push(`Multi-language codebase using ${languages.slice(0, 3).map((l) => l.language).join(", ")}.`);
  if (scores.maintainability >= 75) strengths.push(`Good maintainability (${scores.maintainability}/100) — code is readable and organized.`);
  if (scores.architecture >= 70) strengths.push(`Solid architecture score (${scores.architecture}/100) with ${dependencies.length} detected dependencies.`);
  if (strengths.length === 0) strengths.push(`Active codebase with ${totalFiles} analyzed files.`, `Primary language: ${primaryLang}.`);
  if (repoInfo.stargazers_count > 100) strengths.push(`Community interest: ${repoInfo.stargazers_count} stars.`);

  const weaknesses: string[] = [];
  if (critCount > 0) weaknesses.push(`${critCount} critical security issue${critCount > 1 ? "s" : ""} require immediate attention.`);
  if (highCount > 0) weaknesses.push(`${highCount} high-severity security finding${highCount > 1 ? "s" : ""} detected.`);
  if (avgComplexity > 60) weaknesses.push(`Average complexity is ${Math.round(avgComplexity)} — consider breaking down large functions.`);
  if (complexityReviews.length > 0) weaknesses.push(`${complexityReviews.length} file${complexityReviews.length > 1 ? "s" : ""} flagged for high cyclomatic complexity.`);
  if (scores.maintainability < 60) weaknesses.push(`Maintainability score is low (${scores.maintainability}/100) — code may be hard to modify.`);
  if (totalFiles > 500) weaknesses.push(`Large codebase (${totalFiles} files) — may benefit from modularization.`);
  if (weaknesses.length === 0) weaknesses.push(`No major weaknesses detected. Scores are within acceptable ranges.`);

  const debt: string[] = [];
  if (complexityReviews.length > 0) debt.push(`${complexityReviews.length} files with high complexity need refactoring.`);
  if (avgComplexity > 50) debt.push(`Average complexity (${Math.round(avgComplexity)}) suggests accumulated structural debt.`);
  if (scores.maintainability < 70) debt.push(`Low maintainability score indicates technical debt in code organization.`);
  if (reviews.filter((r) => r.category === "architecture").length > 0) debt.push(`Architecture concerns flagged in ${reviews.filter((r) => r.category === "architecture").length} review(s).`);
  if (debt.length === 0) debt.push(`Technical debt is minimal. No significant structural issues detected.`);

  const improvements: string[] = [];
  if (critCount > 0 || highCount > 0) improvements.push(`Address ${critCount + highCount} security issue${critCount + highCount > 1 ? "s" : ""} — review and patch flagged patterns.`);
  if (avgComplexity > 50) improvements.push(`Refactor high-complexity functions to improve readability and testability.`);
  if (dependencies.length === 0 && totalFiles > 5) improvements.push(`Add explicit dependency imports between modules to improve dependency tracking.`);
  if (scores.architecture < 70) improvements.push(`Improve module separation — consider extracting shared utilities.`);
  if (improvements.length === 0) improvements.push(`Continue maintaining current code quality standards.`, `Consider adding unit tests for critical paths.`);

  return {
    technicalDebt: { title: "Technical Debt", content: debt.join("\n") },
    strengths: { title: "Strengths", content: strengths.join("\n") },
    weaknesses: { title: "Weaknesses", content: weaknesses.join("\n") },
    suggestedImprovements: { title: "Suggested Improvements", content: improvements.join("\n") },
  };
}

export async function analyzeRepository(
  repoInfo: GitHubRepoInfo,
  languages: GitHubLanguageStat,
  tree: GitHubTreeItem[],
  fileContents: Map<string, string>
): Promise<RepositoryAnalysisResult> {
  const repoFiles = tree.filter((item) => {
    const ext = item.path.split(".").pop()?.toLowerCase();
    return ext && !["lock", "sum", "map", "min", "png", "jpg", "gif", "svg", "ico", "woff", "woff2", "ttf", "eot"].includes(ext);
  });

  const { files, fileChanges, securityIssues, reviews, avgComplexity, totalAdditions, totalDeletions } = analyzeRepoFiles(repoFiles, fileContents);
  const scores = calculateRepoScores(securityIssues, avgComplexity, reviews, files.length);
  const langs = buildLanguageStats(languages, repoInfo.size);
  const folderStructure = buildFolderTree(repoFiles);
  const dependencies = buildDependencyGraph(files, fileContents);
  const insights = generateStaticInsights(
    repoInfo, langs, securityIssues, reviews, scores, files.length, avgComplexity, dependencies
  );
  const summary = generateStaticSummary(
    repoInfo.name,
    repoInfo.description || "",
    langs,
    files.length,
    securityIssues,
    avgComplexity,
    scores
  );

  return {
    id: `repo-${repoInfo.full_name.replace("/", "-")}-${Date.now()}`,
    type: "repo",
    repoName: repoInfo.full_name,
    repoOwner: repoInfo.full_name.split("/")[0],
    description: repoInfo.description || "",
    overallScore: scores.overall,
    securityScore: scores.security,
    complexityScore: scores.complexity,
    maintainabilityScore: scores.maintainability,
    architectureScore: scores.architecture,
    totalFiles: files.length,
    totalSize: repoInfo.size,
    totalAdditions,
    totalDeletions,
    filesChanged: fileChanges.length,
    languages: langs,
    folderStructure,
    dependencies,
    files: fileChanges,
    reviews,
    securityIssues,
    technicalDebt: insights.technicalDebt,
    strengths: insights.strengths,
    weaknesses: insights.weaknesses,
    suggestedImprovements: insights.suggestedImprovements,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}
