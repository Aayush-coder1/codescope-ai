export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  risk: "low" | "medium" | "high" | "critical";
  language: string;
  complexity: number;
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
}

export interface SecurityIssue {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  line: number;
  description: string;
  suggestion: string;
}

export interface PerformanceIssue {
  type: string;
  impact: "low" | "medium" | "high";
  line: number;
  description: string;
  suggestion: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: "import" | "require" | "dynamic";
  weight: number;
}

export interface ReviewItem {
  id: string;
  priority: number;
  category: "security" | "performance" | "complexity" | "architecture" | "style";
  severity: "low" | "medium" | "high" | "critical";
  file: string;
  line?: number;
  title: string;
  description: string;
  suggestion: string;
  effort: "quick" | "moderate" | "significant";
}

export interface AnalysisResult {
  id: string;
  type: "pr";
  repoName: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  overallScore: number;
  complexityScore: number;
  securityScore: number;
  performanceScore: number;
  maintainabilityScore: number;
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: number;
  files: FileChange[];
  dependencies: DependencyEdge[];
  reviews: ReviewItem[];
  summary: string;
  aiSummary?: string;
  analyzedAt: string;
}

export interface RepoFile {
  path: string;
  size: number;
  language: string;
}

export interface FolderNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FolderNode[];
  language?: string;
  size?: number;
}

export interface LanguageStat {
  language: string;
  files: number;
  bytes: number;
  percentage: number;
  color: string;
}

export interface RepoInsight {
  title: string;
  content: string;
}

export interface RepositoryAnalysisResult {
  id: string;
  type: "repo";
  repoName: string;
  repoOwner: string;
  description: string;
  overallScore: number;
  securityScore: number;
  complexityScore: number;
  maintainabilityScore: number;
  architectureScore: number;
  totalFiles: number;
  totalSize: number;
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: number;
  languages: LanguageStat[];
  folderStructure: FolderNode;
  dependencies: DependencyEdge[];
  files: FileChange[];
  reviews: ReviewItem[];
  securityIssues: SecurityIssue[];
  technicalDebt: RepoInsight;
  strengths: RepoInsight;
  weaknesses: RepoInsight;
  suggestedImprovements: RepoInsight;
  summary: string;
  aiSummary?: string;
  analyzedAt: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface DiffFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  language: string;
  complexity: number;
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
}

export interface DiffAnalysisResult {
  id: string;
  type: "diff";
  repoName: string;
  overallScore: number;
  securityScore: number;
  complexityScore: number;
  maintainabilityScore: number;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  files: DiffFile[];
  reviews: ReviewItem[];
  summary: string;
  aiSummary?: string;
  analyzedAt: string;
}

export type AnyAnalysisResult = AnalysisResult | RepositoryAnalysisResult | DiffAnalysisResult;
