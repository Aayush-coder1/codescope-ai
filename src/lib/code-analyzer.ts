import { detectLanguage } from "./github";
import type { DiffAnalysisResult, DiffFile, DiffHunk, SecurityIssue, PerformanceIssue, ReviewItem } from "@/types";

const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  severity: SecurityIssue["severity"];
  description: string;
  suggestion: string;
  languages?: string[];
}> = [
  { pattern: /eval\s*\(/g, type: "Code Injection", severity: "critical", description: "eval() executes arbitrary code — a critical security risk", suggestion: "Replace with JSON.parse() or a safe evaluation library" },
  { pattern: /new\s+Function\s*\(/g, type: "Code Injection", severity: "critical", description: "Dynamic Function constructor allows code injection", suggestion: "Use closures or a strategy pattern instead" },
  { pattern: /innerHTML\s*=/g, type: "XSS", severity: "high", description: "Direct innerHTML assignment can enable XSS attacks", suggestion: "Use textContent or sanitize with DOMPurify" },
  { pattern: /dangerouslySetInnerHTML/g, type: "XSS", severity: "high", description: "Bypasses JSX escaping — potential XSS vector", suggestion: "Sanitize with DOMPurify before rendering" },
  { pattern: /\$\{.*\}.*(?:query|execute|exec)\s*\(/g, type: "SQL Injection", severity: "critical", description: "Template literal in SQL query — injection risk", suggestion: "Use parameterized queries" },
  { pattern: /(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]+['"]/gi, type: "Hardcoded Secret", severity: "critical", description: "Hardcoded credential detected in source code", suggestion: "Move to environment variables" },
  { pattern: /(?:exec|spawn|execSync)\s*\(\s*['"`]/g, type: "Command Injection", severity: "high", description: "Shell command with hardcoded string", suggestion: "Use execFile with args array" },
  { pattern: /Math\.random\s*\(\)/g, type: "Weak Randomness", severity: "medium", description: "Math.random() is not cryptographically secure", suggestion: "Use crypto.getRandomValues() for security-sensitive contexts" },
  { pattern: /(?:document\.write|window\.location\s*=)/g, type: "DOM Manipulation", severity: "medium", description: "Direct DOM manipulation can lead to XSS", suggestion: "Use textContent or safe DOM methods" },
  { pattern: /(?:setTimeout|setInterval)\s*\(\s*['"`]/g, type: "Code Injection", severity: "high", description: "String passed to setTimeout/setInterval is evaluated as code", suggestion: "Pass a function reference instead of a string" },
  // Python
  { pattern: /exec\s*\(/g, type: "Code Injection", severity: "critical", description: "exec() executes arbitrary Python code", suggestion: "Use a restricted execution environment" },
  { pattern: /__import__\s*\(/g, type: "Dynamic Import", severity: "high", description: "Dynamic import can load arbitrary modules", suggestion: "Use static imports at the top of the file" },
  { pattern: /pickle\.loads?\s*\(/g, type: "Unsafe Deserialization", severity: "critical", description: "pickle.loads() can execute arbitrary code during deserialization", suggestion: "Use json.loads() or a safe serialization format" },
  { pattern: /os\.system\s*\(/g, type: "Command Injection", severity: "high", description: "os.system() with string — shell injection risk", suggestion: "Use subprocess.run() with args list" },
  { pattern: /subprocess\.call\s*\(\s*['"`]/g, type: "Command Injection", severity: "high", description: "Shell command passed as string to subprocess", suggestion: "Use subprocess.run(['cmd', 'arg1'], shell=False)" },
  { pattern: /yaml\.load\s*\((?!.*Loader)/g, type: "Unsafe YAML", severity: "high", description: "yaml.load() without Loader is unsafe — allows code execution", suggestion: "Use yaml.safe_load() or yaml.load(data, Loader=yaml.SafeLoader)" },
  { pattern: /SQL\s*\+\s*f?['"`]/g, type: "SQL Injection", severity: "critical", description: "String concatenation in SQL query", suggestion: "Use parameterized queries with ? or %s placeholders" },
  // Java
  { pattern: /Runtime\.getRuntime\(\)\.exec/g, type: "Command Injection", severity: "critical", description: "Runtime.exec() can execute arbitrary system commands", suggestion: "Use ProcessBuilder with controlled arguments" },
  { pattern: /ObjectInputStream/g, type: "Unsafe Deserialization", severity: "critical", description: "ObjectInputStream can execute arbitrary code during deserialization", suggestion: "Use JSON or safe serialization formats" },
  { pattern: /XMLReader|SAXParser|DocumentBuilder/g, type: "XXE", severity: "high", description: "XML parser may be vulnerable to XXE attacks", suggestion: "Disable external entity processing" },
  // Go
  { pattern: /os\.Exec\s*\(/g, type: "Command Injection", severity: "high", description: "os/exec with string command", suggestion: "Use exec.Command with separate args" },
  { pattern: /template\.HTML\s*\(/g, type: "XSS", severity: "high", description: "template.HTML() bypasses Go template auto-escaping", suggestion: "Use template.HTML only with trusted content" },
  // Rust
  { pattern: /unsafe\s*\{/g, type: "Unsafe Block", severity: "medium", description: "unsafe block bypasses Rust's safety guarantees", suggestion: "Minimize unsafe code and add safety comments" },
  // SQL
  { pattern: /(?:DELETE|DROP|TRUNCATE)\s+FROM/gi, type: "Destructive SQL", severity: "high", description: "Destructive SQL operation without WHERE clause check", suggestion: "Always add WHERE clause and test with SELECT first" },
];

const PERFORMANCE_PATTERNS: Array<{
  pattern: RegExp;
  type: string;
  impact: PerformanceIssue["impact"];
  description: string;
  suggestion: string;
}> = [
  { pattern: /\.forEach\s*\(\s*async/g, type: "Async Anti-pattern", impact: "high", description: "async forEach doesn't await — operations run in parallel uncontrollably", suggestion: "Use Promise.all() with .map() or a for...of loop" },
  { pattern: /new\s+RegExp\s*\([^)]+\)/g, type: "Dynamic Regex", impact: "medium", description: "Dynamic regex creation can cause ReDoS", suggestion: "Use static regex or validate input length" },
  { pattern: /JSON\.parse\s*\(\s*JSON\.stringify/g, type: "Slow Deep Clone", impact: "medium", description: "JSON serialize/deserialize for cloning is slow", suggestion: "Use structuredClone() or lodash.cloneDeep" },
  { pattern: /console\.(log|warn|error|debug|info)\s*\(/g, type: "Console Statement", impact: "low", description: "Console statements left in production code", suggestion: "Remove or use a logging library with log levels" },
  { pattern: /(?:var\s+)/g, type: "Var Usage", impact: "low", description: "'var' has function scope — can cause unexpected hoisting", suggestion: "Use 'const' or 'let' for block scoping" },
  // Python
  { pattern: /for\s+\w+\s+in\s+range\s*\(\s*len\s*\(/g, type: "Non-Pythonic Loop", impact: "low", description: "Iterating with range(len()) is non-Pythonic", suggestion: "Use enumerate() or direct iteration" },
  { pattern: /\+\s*=\s*['"]/g, type: "String Concatenation", impact: "medium", description: "String concatenation in a loop creates new strings each iteration", suggestion: "Use f-strings, str.join(), or io.StringIO" },
  { pattern: /import\s+\*/g, type: "Wildcard Import", impact: "low", description: "Wildcard import pollutes namespace and hurts readability", suggestion: "Import specific names: from module import name1, name2" },
  // Java
  { pattern: /new\s+StringBuffer\s*\(/g, type: "StringBuffer Usage", impact: "low", description: "StringBuffer is synchronized — slower than StringBuilder", suggestion: "Use StringBuilder unless thread safety is needed" },
  { pattern: /\.equals\s*\(\s*['"]/g, type: "String Comparison", impact: "low", description: "Comparing with .equals() on string literals", suggestion: "Use .equals() for string comparison (this is correct, but note: == checks reference)" },
  // General
  { pattern: /while\s*\(\s*true\s*\)/g, type: "Infinite Loop Risk", impact: "medium", description: "while(true) can cause CPU spinning if no break/return", suggestion: "Add timeout, break condition, or use event-driven pattern" },
  { pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, type: "Swallowed Error", impact: "medium", description: "Empty catch block silently swallows errors", suggestion: "Log the error or re-throw — never silently swallow exceptions" },
];

function estimateComplexity(code: string): number {
  let score = 10;
  const controlFlow = (code.match(/\b(?:if|else\s+if|elif|switch|case|for|while|do|catch|try|except|match)\b/g)?.length || 0);
  score += controlFlow * 3;
  const functions = (code.match(/\b(?:function|=>|def|fn|func|method|pub\s+fn|fn\s+main|func\s+)\b/g)?.length || 0);
  score += functions * 2;
  let maxNesting = 0;
  let currentNesting = 0;
  for (const ch of code) {
    if (ch === "{" || ch === "(" || ch === "[") { currentNesting++; maxNesting = Math.max(maxNesting, currentNesting); }
    else if (ch === "}" || ch === ")" || ch === "]") { currentNesting--; }
  }
  score += maxNesting * 4;
  const lines = code.split("\n").length;
  score += Math.floor(lines / 20);
  return Math.min(100, Math.max(5, score));
}

function detectLangFromCode(code: string): string {
  if (/^\s*(?:def|import|from|class)\s+\w+/m.test(code) && !/function\s+\w+/.test(code)) return "python";
  if (/\b(?:pub\s+fn|impl|struct|enum|use\s+\w+::)/.test(code)) return "rust";
  if (/\b(?:func|package|import\s+")/.test(code) && !/function/.test(code)) return "go";
  if (/\b(?:class|public|private|protected|void|int\s+main)/.test(code) && /;\s*$/.test(code.split("\n")[0])) return "java";
  if (/<\?php|<\?=/.test(code)) return "php";
  if (/#include\s+</.test(code)) return "c";
  return "javascript";
}

export function analyzeCode(code: string, filename?: string): DiffAnalysisResult {
  const lines = code.split("\n");
  const totalAdditions = lines.filter((l) => l.trim().length > 0).length;
  const ext = filename?.split(".").pop() || "txt";
  let language = detectLanguage(filename || "code." + ext);
  if (language === "text" || language === "unknown") {
    language = detectLangFromCode(code);
  }
  const complexity = estimateComplexity(code);

  const securityIssues: SecurityIssue[] = [];
  for (const rule of SECURITY_PATTERNS) {
    const matches = code.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
    for (const match of matches) {
      const lineNum = code.substring(0, match.index).split("\n").length;
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
  for (const rule of PERFORMANCE_PATTERNS) {
    const matches = code.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags));
    for (const match of matches) {
      const lineNum = code.substring(0, match.index).split("\n").length;
      performanceIssues.push({
        type: rule.type,
        impact: rule.impact,
        line: lineNum,
        description: rule.description,
        suggestion: rule.suggestion,
      });
    }
  }

  const reviews: ReviewItem[] = [];
  let id = 1;

  for (const issue of securityIssues) {
    reviews.push({
      id: `r${id++}`,
      priority: id,
      category: "security",
      severity: issue.severity,
      file: filename || "pasted-code",
      line: issue.line,
      title: `${issue.type} — ${issue.description}`,
      description: issue.suggestion,
      suggestion: issue.suggestion,
      effort: issue.severity === "critical" ? "quick" : "moderate",
    });
  }

  for (const issue of performanceIssues) {
    reviews.push({
      id: `r${id++}`,
      priority: id,
      category: "performance",
      severity: issue.impact === "high" ? "high" : issue.impact === "medium" ? "medium" : "low",
      file: filename || "pasted-code",
      line: issue.line,
      title: `${issue.type} — ${issue.description}`,
      description: issue.suggestion,
      suggestion: issue.suggestion,
      effort: issue.impact === "high" ? "quick" : "moderate",
    });
  }

  if (complexity > 70) {
    reviews.push({
      id: `r${id++}`,
      priority: id,
      category: "complexity",
      severity: complexity > 85 ? "high" : "medium",
      file: filename || "pasted-code",
      title: `High complexity (${complexity})`,
      description: `Cyclomatic complexity of ${complexity}. Consider breaking into smaller functions.`,
      suggestion: "Extract helpers, reduce nesting, apply Single Responsibility Principle.",
      effort: complexity > 85 ? "significant" : "moderate",
    });
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const categoryOrder = { security: 0, performance: 1, complexity: 2, architecture: 3, style: 4 };
  reviews.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });
  reviews.forEach((r, i) => (r.priority = i + 1));

  const hunk: DiffHunk = {
    oldStart: 1,
    oldLines: 0,
    newStart: 1,
    newLines: totalAdditions,
    content: code,
  };

  const file: DiffFile = {
    path: filename || "pasted-code",
    status: "added",
    additions: totalAdditions,
    deletions: 0,
    hunks: [hunk],
    language,
    complexity,
    securityIssues,
    performanceIssues,
  };

  const overallScore = Math.max(10, 100 - securityIssues.length * 15 - performanceIssues.length * 5 - (complexity > 70 ? 15 : 0));

  return {
    id: `code-${Date.now()}`,
    type: "diff",
    repoName: "pasted-code",
    totalFiles: 1,
    totalAdditions,
    totalDeletions: 0,
    files: [file],
    reviews,
    overallScore,
    securityScore: Math.max(0, 100 - securityIssues.filter((i) => i.severity === "critical").length * 25 - securityIssues.filter((i) => i.severity === "high").length * 10),
    maintainabilityScore: Math.max(0, 100 - complexity),
    complexityScore: Math.max(0, 100 - complexity),
    summary: `Analyzed ${language} code (${totalAdditions} lines). Found ${securityIssues.length} security and ${performanceIssues.length} performance issues. Complexity: ${complexity}/100.`,
    aiSummary: undefined,
    analyzedAt: new Date().toISOString(),
  };
}
