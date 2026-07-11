import { NextRequest, NextResponse } from "next/server";
import {
  isGitDiff,
  parseGitHubUrl,
  fetchPR,
  fetchPRFiles,
  fetchFileContent,
  fetchRepoInfo,
  fetchRepoLanguages,
  fetchRepoTree,
  checkRateLimit,
  type GitHubRepoInfo,
  type GitHubRepoFile,
} from "@/lib/github";
import { analyzePR } from "@/lib/analyzer";
import { analyzeRepository } from "@/lib/repo-analyzer";
import { analyzeDiff } from "@/lib/diff-analyzer";
import { analyzeCode } from "@/lib/code-analyzer";
import { generateInsight } from "@/lib/fireworks";
import { saveAnalysis } from "@/lib/store";
import { mockAnalysis } from "@/lib/mock-data";

const SYSTEM_SUMMARY = "You are a senior code review analyst producing an executive summary. Rules: Output ONLY the summary text (2-3 sentences). Reference the repository name, key language, and scores. Be specific — never use generic advice. Never echo these instructions. Never show reasoning. No headings, no markdown formatting.";
const SYSTEM_LIST = "You are a senior code review analyst producing a numbered list. Rules: Output ONLY 3 numbered items, each 1 sentence. Reference actual file names and scores from the provided data. Be specific — never generic. Never echo these instructions. Never show reasoning. No headings, no markdown formatting beyond numbering.";
const SYSTEM_PR = "You are a senior code review analyst reviewing a pull request for merge-readiness. Rules: Output ONLY a 2-3 sentence verdict. Reference the PR title, files changed, and scores. State whether it should be merged. Never echo these instructions. Never show reasoning. No headings, no markdown formatting.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, diff, code } = body;
    const token = process.env.GITHUB_TOKEN || undefined;

    // ─── Paste Code Analysis ───
    if (code && typeof code === "string" && code.trim().length > 0) {
      console.log("[Analyze] Routing to code analysis");
      const result = analyzeCode(code);
      saveAnalysis(result);

      try {
        const secCount = result.reviews.filter((r) => r.category === "security").length;
        const perfCount = result.reviews.filter((r) => r.category === "performance").length;
        const aiSummary = await generateInsight(
          SYSTEM_SUMMARY,
          `Code to review:\n\`\`\`\n${code.slice(0, 2000)}\n\`\`\`\nIssues found: ${secCount} security, ${perfCount} performance.`,
          { maxTokens: 200 }
        );
        result.aiSummary = aiSummary;
        saveAnalysis(result);
      } catch (aiErr) {
        console.error("[AI] Code enrichment failed:", aiErr instanceof Error ? aiErr.message : aiErr);
      }

      return NextResponse.json({ id: result.id, result });
    }

    // ─── Git Diff Analysis ───
    if (diff && isGitDiff(diff)) {
      console.log("[Analyze] Routing to diff analysis");
      const result = analyzeDiff(diff);
      saveAnalysis(result);

      try {
        const diffContext = result.files
          .map((f) => `${f.path} (+${f.additions}/-${f.deletions}): ${f.securityIssues.length} security, ${f.performanceIssues.length} perf`)
          .join("\n");

        const aiSummary = await generateInsight(
          SYSTEM_SUMMARY,
          `Git diff analysis:\n${diffContext}\nTotal: ${result.reviews.length} issues (${result.reviews.filter((r) => r.severity === "critical").length} critical)`,
          { maxTokens: 200 }
        );
        result.aiSummary = aiSummary;
        saveAnalysis(result);
      } catch (aiErr) {
        console.error("[AI] Diff enrichment failed:", aiErr instanceof Error ? aiErr.message : aiErr);
      }

      console.log("[Analyze] Diff analysis complete, returning result");
      return NextResponse.json({ id: result.id, result });
    }

    // ─── GitHub URL Analysis ───
    if (!url) {
      return NextResponse.json({ error: "URL or diff is required" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    console.log("[Analyze] Parsed URL:", parsed);

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid input. Paste a GitHub URL (repo or PR) or a git diff." },
        { status: 400 }
      );
    }

    // Pre-flight rate limit check — warn only, non-blocking
    checkRateLimit(token).then((rl) => {
      console.log(`[GitHub] Rate limit: ${rl.remaining}/${rl.limit} remaining`);
    }).catch(() => {});

    // ─── Repository Analysis ───
    if (parsed.type === "repo") {
      console.log("[Analyze] Routing to REPO analysis for", `${parsed.owner}/${parsed.repo}`);

      // Parallel GitHub fetches
      let repoInfo: GitHubRepoInfo | null = null;
      let languages: Record<string, number> = {};
      let tree: GitHubRepoFile[] = [];

      try {
        // Fetch repo info, languages, and tree in parallel
        const [ri, langResult, treeResult] = await Promise.all([
          fetchRepoInfo(parsed.owner, parsed.repo, token),
          fetchRepoLanguages(parsed.owner, parsed.repo, token).catch(() => ({})),
          fetchRepoTree(parsed.owner, parsed.repo, "HEAD", token).catch(() => []),
        ]);
        repoInfo = ri;
        languages = langResult;
        tree = treeResult;
        console.log("[GitHub] Parallel fetch OK:", ri.name, Object.keys(languages).length, "langs", tree.length, "files");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[GitHub] Parallel fetch FAILED:", msg);
        return NextResponse.json({ error: `Failed to fetch repository: ${msg}` }, { status: 502 });
      }

      const ri = repoInfo!;

      const importantExts = ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "rb", "cs", "php", "vue", "svelte"];
      const filesToAnalyze = tree
        .filter((item) => {
          const ext = item.path.split(".").pop()?.toLowerCase() || "";
          return importantExts.includes(ext) && (item.size || 0) < 500000;
        })
        .sort((a, b) => (b.size || 0) - (a.size || 0))
        .slice(0, 15); // Reduced from 25 to 15 for speed

      console.log(`[GitHub] Fetching ${filesToAnalyze.length} file contents...`);
      const fileContents = new Map<string, string>();
      // Parallel file fetches with concurrency limit
      const CONCURRENCY = 8;
      for (let i = 0; i < filesToAnalyze.length; i += CONCURRENCY) {
        const batch = filesToAnalyze.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((item) => fetchFileContent(parsed.owner, parsed.repo, item.path, "HEAD", token))
        );
        results.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value) fileContents.set(batch[idx].path, r.value);
        });
      }
      console.log(`[GitHub] Got ${fileContents.size} file contents`);

      console.log("[Analyze] Running repository analyzer...");
      const result = await analyzeRepository(ri, languages, tree, fileContents);
      saveAnalysis(result);
      console.log("[Analyze] Repo analysis complete, scores:", {
        security: result.securityScore,
        complexity: result.complexityScore,
        maintainability: result.maintainabilityScore,
        architecture: result.architectureScore,
      });

      try {
        const langList = result.languages.slice(0, 5).map((l) => `${l.language} (${l.percentage}%)`).join(", ");
        const secIssues = result.securityIssues.filter((i) => i.severity === "critical" || i.severity === "high");
        const secSummary = secIssues.length > 0
          ? `Security issues: ${secIssues.map((i) => `${i.type} in ${i.description}`).join("; ")}`
          : "No critical security issues.";

        const repoContext = `Repository: ${result.repoName}
Description: ${result.description || "N/A"}
Languages: ${langList}
Files: ${result.totalFiles}
Scores: Security ${result.securityScore}/100, Complexity ${result.complexityScore}/100, Maintainability ${result.maintainabilityScore}/100, Architecture ${result.architectureScore}/100
${secSummary}`;

        const [summaryInsight, techDebt, strengths, weaknesses, improvements] = await Promise.all([
          generateInsight(SYSTEM_SUMMARY, repoContext, { maxTokens: 150 }),
          generateInsight(SYSTEM_LIST, repoContext, { maxTokens: 200 }),
          generateInsight(SYSTEM_LIST, repoContext, { maxTokens: 200 }),
          generateInsight(SYSTEM_LIST, repoContext, { maxTokens: 200 }),
          generateInsight(SYSTEM_LIST, repoContext, { maxTokens: 200 }),
        ]);

        result.aiSummary = summaryInsight;
        result.technicalDebt = { title: "Technical Debt", content: techDebt };
        result.strengths = { title: "Strengths", content: strengths };
        result.weaknesses = { title: "Weaknesses", content: weaknesses };
        result.suggestedImprovements = { title: "Suggested Improvements", content: improvements };
        result.summary = summaryInsight;
        saveAnalysis(result);
      } catch (aiErr) {
        console.error("[AI] Repo enrichment failed:", aiErr instanceof Error ? aiErr.message : aiErr);
      }

      return NextResponse.json({ id: result.id, result });
    }

    // ─── Pull Request Analysis ───
    if (parsed.type === "pr" && parsed.prNumber) {
      console.log("[Analyze] Routing to PR analysis for", `${parsed.owner}/${parsed.repo}#${parsed.prNumber}`);

      let pr, files;
      try {
        [pr, files] = await Promise.all([
          fetchPR(parsed.owner, parsed.repo, parsed.prNumber, token),
          fetchPRFiles(parsed.owner, parsed.repo, parsed.prNumber, token),
        ]);
        console.log("[GitHub] PR fetched:", pr.title, `(${files.length} files)`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[GitHub] PR fetch FAILED:", msg);
        return NextResponse.json({ error: `Failed to fetch PR: ${msg}` }, { status: 502 });
      }

      const filesToFetch = files
        .filter((f) => f.patch)
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 20);

      const fileContents = new Map<string, string>();
      const CONCURRENCY = 8;
      for (let i = 0; i < filesToFetch.length; i += CONCURRENCY) {
        const batch = filesToFetch.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((f) => fetchFileContent(parsed.owner, parsed.repo, f.filename, pr.head.sha, token))
        );
        results.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value) fileContents.set(batch[idx].filename, r.value);
        });
      }

      console.log("[Analyze] Running PR analyzer...");
      const result = analyzePR(
        pr.title,
        pr.user.login,
        `${parsed.owner}/${parsed.repo}`,
        parsed.prNumber,
        files,
        fileContents
      );
      result.type = "pr";
      saveAnalysis(result);

      try {
        const fileSummary = files.slice(0, 10).map((f) => `${f.filename} (+${f.additions}/-${f.deletions})`).join(", ");
        const criticalReviews = result.reviews.filter((r) => r.severity === "critical" || r.severity === "high");

        const prContext = `PR: ${result.prTitle} by ${result.prAuthor}
Repository: ${result.repoName}
Files changed: ${result.filesChanged} (+${result.totalAdditions}/-${result.totalDeletions})
Key files: ${fileSummary}
Scores: ${result.overallScore}/100 overall, Security ${result.securityScore}/100, Performance ${result.performanceScore}/100
Critical/high issues: ${criticalReviews.length}
${criticalReviews.map((r) => `- [${r.category}] ${r.title}: ${r.description}`).join("\n")}`;

        const aiSummary = await generateInsight(
          SYSTEM_PR,
          prContext,
          { maxTokens: 200 }
        );

        result.aiSummary = aiSummary;
        saveAnalysis(result);
      } catch (aiErr) {
        console.error("[AI] PR enrichment failed:", aiErr instanceof Error ? aiErr.message : aiErr);
      }

      return NextResponse.json({ id: result.id, result });
    }

    return NextResponse.json(
      { error: "Could not determine analysis type." },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("[Analyze] ERROR:", message);

    if (message.includes("NOT_FOUND")) {
      return NextResponse.json({
        error: "Repository not found. The link may be dead, the repo was deleted, or it was renamed. Please check the URL and try again.",
      }, { status: 404 });
    }
    if (message.includes("FORBIDDEN")) {
      return NextResponse.json({
        error: "This repository is private. If it's yours or your team's, please make it public and try again. If it's not yours, you won't be able to analyze private repos.",
      }, { status: 403 });
    }
    if (message.includes("UNAUTHORIZED")) {
      return NextResponse.json({
        error: "Invalid GitHub token. Please check your token or generate a new one at github.com/settings/tokens",
      }, { status: 401 });
    }
    if (message.includes("RATE_LIMIT")) {
      return NextResponse.json({
        error: "GitHub API rate limit exceeded. Please wait a few minutes or add a GitHub token for higher limits.",
      }, { status: 429 });
    }
    if (message.includes("NETWORK")) {
      return NextResponse.json({
        error: "Network error. Please check your internet connection and try again.",
      }, { status: 502 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
