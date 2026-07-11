export interface GitHubPR {
  title: string;
  body: string;
  state: string;
  user: { login: string };
  head: { sha: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  changed_files: number;
  additions: number;
  deletions: number;
}

export interface GitHubPRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export type GitHubFile = GitHubPRFile;
export type GitHubLanguageStat = Record<string, number>;
export type GitHubTreeItem = GitHubRepoFile;

export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  license?: { spdx_id: string | null } | null;
}

export interface GitHubRepoFile {
  path: string;
  mode: string;
  type: string;
  size?: number;
  sha: string;
}

// ─── In-memory cache ───
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Rate limit check ───
export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetsAt: number; // unix seconds
}

export async function checkRateLimit(token?: string): Promise<RateLimitInfo> {
  try {
    const data = await ghFetch<{ resources: { core: { remaining: number; limit: number; reset: number } } }>(
      "https://api.github.com/rate_limit",
      token,
      { noCache: true }
    );
    const core = data.resources?.core;
    return {
      remaining: core?.remaining ?? 0,
      limit: core?.limit ?? 60,
      resetsAt: core?.reset ?? 0,
    };
  } catch {
    return { remaining: 0, limit: token ? 5000 : 60, resetsAt: 0 };
  }
}

// ─── Core fetcher with caching + redirect following + error surfacing ───
function ghFetchRaw<T>(url: string, token?: string, maxRedirects = 5): Promise<T> {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const urlObj = new (require("url").URL)(url);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CodeScope-AI/1.0",
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    console.log("[ghFetch] GET", url);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers,
      },
      (res: { statusCode: number; statusMessage: string; headers: Record<string, string>; on: (event: string, cb: (chunk: Buffer) => void) => void }) => {
        let body = "";
        res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        res.on("end", () => {
          const status = res.statusCode || 0;

          // Follow redirects
          if ((status === 301 || status === 302 || status === 307 || status === 308) && maxRedirects > 0) {
            // GitHub puts redirect URL in Location header OR in response body as {"url": "..."}
            let redirectUrl = res.headers.location;
            if (!redirectUrl && body) {
              try {
                const parsed = JSON.parse(body);
                redirectUrl = parsed.url;
              } catch {}
            }
            if (redirectUrl) {
              const fullUrl = redirectUrl.startsWith("http")
                ? redirectUrl
                : `https://${urlObj.hostname}${redirectUrl}`;
              console.log("[ghFetch] Redirect", status, "->", fullUrl);
              ghFetchRaw<T>(fullUrl, token, maxRedirects - 1).then(resolve).catch(reject);
              return;
            }
          }

          if (status === 404) {
            reject(new Error(`NOT_FOUND: The repository or resource was not found. The repo may be deleted, renamed, or private.`));
            return;
          }
          if (status === 403) {
            reject(new Error(`FORBIDDEN: Access denied. The repository is likely private. If it's your repo, make it public and try again.`));
            return;
          }
          if (status === 401) {
            reject(new Error(`UNAUTHORIZED: Bad credentials. Your GitHub token may be invalid or expired.`));
            return;
          }
          if (status === 403 || status === 429) {
            const resetTime = res.headers["x-ratelimit-reset"]
              ? new Date(Number(res.headers["x-ratelimit-reset"]) * 1000).toLocaleTimeString()
              : "unknown";
            reject(new Error(`RATE_LIMIT: GitHub API rate limit hit. Resets at ${resetTime}.`));
            return;
          }
          if (status < 200 || status >= 300) {
            reject(new Error(`GitHub API error ${status}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Invalid JSON from GitHub API: ${body.slice(0, 100)}`));
          }
        });
      }
    );
    req.on("error", (err: Error) => reject(new Error(`NETWORK: ${err.message}`)));
    req.end();
  });
}

async function ghFetch<T>(url: string, token?: string, opts?: { noCache?: boolean }): Promise<T> {
  const cacheKey = `${token ? "auth" : "anon"}:${url}`;
  if (!opts?.noCache) {
    const cached = cacheGet<T>(cacheKey);
    if (cached !== null) return cached;
  }

  const data = await ghFetchRaw<T>(url, token);
  cacheSet(cacheKey, data);
  return data;
}

// ─── GitHub API calls ───

export function parseGitHubUrl(url: string): { type: "repo" | "pr"; owner: string; repo: string; prNumber?: number } | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
    /github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      if (match.length >= 4 && match[3]) {
        return { type: "pr", owner: match[1], repo: match[2], prNumber: Number(match[3]) };
      }
      return { type: "repo", owner: match[1], repo: match[2] };
    }
  }
  return null;
}

export function isGitDiff(input: string): boolean {
  const lines = input.split("\n");
  let hasDiffHeader = false;
  let hasHunk = false;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) hasDiffHeader = true;
    if (line.startsWith("@@ ")) hasHunk = true;
    if (hasDiffHeader && hasHunk) return true;
  }
  return false;
}

export async function fetchPR(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<GitHubPR> {
  return ghFetch<GitHubPR>(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    token
  );
}

export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<GitHubPRFile[]> {
  const allFiles: GitHubPRFile[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const files = await ghFetch<GitHubPRFile[]>(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`,
      token
    );
    allFiles.push(...files);
    if (files.length < perPage) break;
    page++;
  }

  return allFiles;
}

export async function fetchRepoInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepoInfo> {
  return ghFetch<GitHubRepoInfo>(
    `https://api.github.com/repos/${owner}/${repo}`,
    token
  );
}

export async function fetchRepoLanguages(
  owner: string,
  repo: string,
  token?: string
): Promise<Record<string, number>> {
  return ghFetch<Record<string, number>>(
    `https://api.github.com/repos/${owner}/${repo}/languages`,
    token
  );
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  sha: string,
  token?: string
): Promise<GitHubRepoFile[]> {
  const data = await ghFetch<{ tree: GitHubRepoFile[] }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    token
  );
  return (data.tree || []).filter((item) => item.type === "blob");
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string
): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    const data = await ghFetch<{ content?: string; encoding?: string }>(url, token);
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchPRDiff(
  owner: string,
  repo: string,
  prNumber: number,
  token?: string
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const https = require("https");
  const urlObj = new (require("url").URL)(url);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.diff",
    "User-Agent": "CodeScope-AI/1.0",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  return new Promise<string>((resolve, reject) => {
    const req = https.request(
      { hostname: urlObj.hostname, path: urlObj.pathname, method: "GET", headers },
      (res: { statusCode: number; on: (event: string, cb: (chunk: Buffer) => void) => void }) => {
        let body = "";
        res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Failed to fetch diff: ${res.statusCode}`));
          } else {
            resolve(body);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    py: "Python",
    go: "Go",
    rs: "Rust",
    java: "Java",
    rb: "Ruby",
    cs: "C#",
    php: "PHP",
    c: "C",
    cpp: "C++",
    h: "C/C++ Header",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    sql: "SQL",
    sh: "Shell",
    bash: "Shell",
    dockerfile: "Dockerfile",
    graphql: "GraphQL",
    vue: "Vue",
    svelte: "Svelte",
  };
  return map[ext] || ext.toUpperCase() || "Unknown";
}

export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178C6",
    JavaScript: "#F7DF1E",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#DEA584",
    Java: "#B07219",
    Ruby: "#701516",
    "C#": "#178600",
    PHP: "#4F5D95",
    C: "#555555",
    "C++": "#F34B7D",
    CSS: "#563D7C",
    HTML: "#E34C26",
    JSON: "#292929",
    YAML: "#CB171E",
    Markdown: "#083FA1",
    SQL: "#e38c00",
    Shell: "#89e051",
    Dockerfile: "#384D54",
    GraphQL: "#E10098",
    Vue: "#41B883",
    Svelte: "#FF3E00",
  };
  return colors[language] || "#6B7280";
}
