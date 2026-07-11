"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, GitPullRequest, Code2, Shield, Zap, ArrowRight, Sparkles, AlertCircle, Loader2, Key, Folder, FileDiff, CheckCircle2, Eye, Brain, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Particles } from "@/components/ui/particles";

const SAMPLE_DIFF = `diff --git a/src/auth/login.ts b/src/auth/login.ts
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,12 +1,18 @@
-import { validateUser } from './utils';
+import { validateUser, hashPassword } from './utils';
 
 export async function login(username: string, password: string) {
-  const user = await db.query(\`SELECT * FROM users WHERE name='\${username}'\`);
-  if (user && user.password === password) {
+  const user = await db.query(
+    'SELECT * FROM users WHERE name = ?',
+    [username]
+  );
+  const hashedInput = await hashPassword(password);
+  if (user && user.password === hashedInput) {
     return { token: generateToken(user.id) };
   }
+  // TODO: remove debug log
+  console.log('Login attempt:', username, password);
   return null;
 }`;

const SAMPLE_CODE_PY = `import os
import pickle

def load_user_data(data_bytes):
    """Deserialize user profile data."""
    return pickle.loads(data_bytes)

def run_command(cmd):
    os.system(cmd)

def read_config(path):
    with open(path) as f:
        return eval(f.read())`;

const SAMPLE_CODE_JS = `const express = require('express');
const jwt = require('jsonwebtoken');

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = \`SELECT * FROM users WHERE name='\${username}' AND pass='\${password}'\`;
  const user = db.run(query);
  if (user) {
    const token = jwt.sign({ id: user.id }, 'supersecretkey123');
    eval('console.log("logged in")');
    res.json({ token });
  }
});`;

export default function LandingPage() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"url" | "diff" | "code">("url");
  const [diffText, setDiffText] = useState("");
  const [codeText, setCodeText] = useState("");
  const [codeLang, setCodeLang] = useState<string>("");
  const [showSamples, setShowSamples] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const router = useRouter();
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const handleAnalyze = useCallback(async () => {
    if (activeTab === "diff" && !diffText.trim()) return;
    if (activeTab === "url" && !input.trim()) return;
    if (activeTab === "code" && !codeText.trim()) return;
    setError("");
    setIsAnalyzing(true);

    try {
      const body: Record<string, string> = {};
      if (activeTab === "diff") {
        body.diff = diffText;
      } else if (activeTab === "code") {
        body.code = codeText;
        if (codeLang) body.filename = `code.${codeLang}`;
      } else {
        body.url = input;
      }
      if (token) body.token = token;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.demo) {
        setDemoMode(true);
        setTimeout(() => router.push("/analyze/demo-001"), 600);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error || "Analysis failed. Try again.");
        setIsAnalyzing(false);
        return;
      }

      router.push(`/analyze/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Is the dev server running?");
      setIsAnalyzing(false);
    }
  }, [activeTab, input, diffText, codeText, codeLang, token, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const loadDemo = () => {
    setIsAnalyzing(true);
    setDemoMode(true);
    setTimeout(() => router.push("/analyze/demo-001"), 400);
  };

  const isAnalyzable =
    (activeTab === "url" && input.trim()) ||
    (activeTab === "diff" && diffText.trim()) ||
    (activeTab === "code" && codeText.trim());

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden grid-bg">
      <Particles count={70} />

      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-purple-500/[0.04] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full z-50"
      >
        <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-xl border-b border-white/5" />
        <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Eye className="w-4.5 h-4.5 text-white" />
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 blur opacity-40" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">CodeScope</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-purple-400">AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground/50 hidden sm:flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              Powered by AMD Fireworks AI
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-[10px] text-green-400/80">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8 hover:bg-white/[0.06] transition-colors cursor-default">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            AI-Powered Code Intelligence
            <span className="w-1 h-1 rounded-full bg-purple-400/50" />
            <span className="text-purple-400/70">Live Demo</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
        >
          See your code.
          <br />
          <span className="gradient-text">Don&apos;t just review it.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-base sm:text-lg text-muted-foreground/80 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Drop in a repo, PR, diff, or code snippet.{" "}
          <span className="text-white/60">Get an intelligence dashboard with AI-driven insights in seconds.</span>
        </motion.p>

        {/* Tab Selector */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-2xl mx-auto mb-4"
        >
          <div className="flex items-center justify-center gap-1 p-1 glass rounded-xl mb-5 max-w-sm mx-auto">
            {([
              { key: "url" as const, icon: <Search className="w-3.5 h-3.5" />, label: "GitHub URL", gradient: "from-blue-500/20 to-purple-500/20" },
              { key: "diff" as const, icon: <FileDiff className="w-3.5 h-3.5" />, label: "Git Diff", gradient: "from-orange-500/20 to-red-500/20" },
              { key: "code" as const, icon: <Code2 className="w-3.5 h-3.5" />, label: "Paste Code", gradient: "from-green-500/20 to-emerald-500/20" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                    : "text-muted-foreground hover:text-white/70 hover:bg-white/[0.03]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "url" && (
              <motion.div
                key="url"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative flex items-center glass rounded-2xl p-2">
                  <Search className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
                  <Input
                    type="text"
                    placeholder="github.com/owner/repo or /pull/123"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAnalyzing}
                    className="flex-1 border-0 bg-transparent text-white placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !input.trim()}
                    className="h-10 px-6 bg-white text-black hover:bg-white/90 rounded-xl font-semibold shrink-0 disabled:opacity-30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Analyze
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {activeTab === "diff" && (
              <motion.div
                key="diff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative glass rounded-2xl p-2">
                  <textarea
                    placeholder={`diff --git a/src/auth/login.ts b/src/auth/login.ts\n--- a/src/auth/login.ts\n+++ b/src/auth/login.ts\n@@ -1,5 +1,8 @@\n-import { validateUser } from './utils';\n+import { validateUser, hashPassword } from './utils';`}
                    value={diffText}
                    onChange={(e) => setDiffText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAnalyzing}
                    className="w-full h-36 bg-transparent text-white placeholder:text-muted-foreground/30 text-xs font-mono p-3 resize-none focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setDiffText(SAMPLE_DIFF); }}
                        className="text-[10px] text-orange-400/60 hover:text-orange-400 transition-colors underline underline-offset-2 decoration-dotted"
                      >
                        Load sample diff
                      </button>
                      {diffText && (
                        <span className="text-[10px] text-green-400/50 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {diffText.split("\n").length} lines
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !diffText.trim()}
                      className="h-8 px-5 bg-white text-black hover:bg-white/90 rounded-xl font-semibold text-xs disabled:opacity-30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          Analyze
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative glass rounded-2xl p-2">
                  <textarea
                    ref={codeRef}
                    placeholder={"// Paste any language — JS, Python, Java, Go, Rust, SQL...\n// We detect the language and analyze security + performance\n\nfunction login(username, password) {\n  const query = `SELECT * FROM users WHERE name='${username}'`;\n  return db.run(query);\n}"}
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isAnalyzing}
                    className="w-full h-40 bg-transparent text-white placeholder:text-muted-foreground/30 text-xs font-mono p-3 resize-none focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {["", "js", "py", "java", "go", "rs", "sql", "c", "cpp"].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setCodeLang(lang)}
                            className={`px-2 py-1 rounded-md text-[10px] font-mono transition-all duration-150 ${
                              codeLang === lang
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/[0.05]"
                            }`}
                          >
                            {lang || "auto"}
                          </button>
                        ))}
                      </div>
                      {codeText && (
                        <span className="text-[10px] text-green-400/50 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {codeText.split("\n").length} lines
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !codeText.trim()}
                      className="h-8 px-5 bg-white text-black hover:bg-white/90 rounded-xl font-semibold text-xs disabled:opacity-30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          Analyze
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quick paste samples */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <span className="text-[11px] text-muted-foreground/40">Try:</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCodeText(SAMPLE_CODE_PY); setCodeLang("py"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/[0.06] border border-red-500/10 text-[11px] text-red-300/70 hover:text-red-300 hover:bg-red-500/[0.1] hover:border-red-500/20 transition-all duration-200"
                  >
                    <Shield className="w-3 h-3" />
                    Python (unsafe)
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCodeText(SAMPLE_CODE_JS); setCodeLang("js"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/[0.06] border border-orange-500/10 text-[11px] text-orange-300/70 hover:text-orange-300 hover:bg-orange-500/[0.1] hover:border-orange-500/20 transition-all duration-200"
                  >
                    <AlertCircle className="w-3 h-3" />
                    JS (vulnerable)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="max-w-2xl mx-auto mb-5"
            >
              <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-500/[0.08] border border-red-500/20 text-sm text-red-300 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-red-200 mb-0.5">Analysis Error</p>
                  <p className="text-red-300/80 text-xs leading-relaxed">{error}</p>
                </div>
                <button onClick={() => setError("")} className="text-red-400/50 hover:text-red-400 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo mode */}
        {demoMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto mb-5">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-purple-500/[0.08] border border-purple-500/20 text-sm text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span className="text-xs">Loading demo analysis...</span>
            </div>
          </motion.div>
        )}

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-3 text-xs text-muted-foreground/50 mb-16 flex-wrap"
        >
          <span className="text-muted-foreground/30">Try:</span>
          {[
            { icon: <Folder className="w-3 h-3" />, label: "microsoft/vscode", url: "https://github.com/microsoft/vscode" },
            { icon: <GitPullRequest className="w-3 h-3" />, label: "facebook/react#32666", url: "https://github.com/facebook/react/pull/32666" },
            { icon: <FileDiff className="w-3 h-3" />, label: "git diff", action: () => { setActiveTab("diff"); setDiffText(SAMPLE_DIFF); } },
          ].map((item, i) => (
            <span key={item.label} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/20">·</span>}
              <button
                onClick={() => {
                  if (item.action) { item.action(); }
                  else { setActiveTab("url"); setInput(item.url!); }
                }}
                className="flex items-center gap-1 hover:text-white transition-colors underline underline-offset-2 decoration-white/15 hover:decoration-white/30"
              >
                {item.icon} {item.label}
              </button>
            </span>
          ))}
          <span className="text-muted-foreground/20">·</span>
          <button
            onClick={loadDemo}
            className="hover:text-purple-400 transition-colors text-purple-400/60 flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> Live demo
          </button>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-20"
        >
          {[
            {
              icon: <Folder className="w-5 h-5" />,
              title: "Repository Intelligence",
              desc: "Full codebase analysis — architecture, languages, dependency graphs, and technical debt scoring.",
              gradient: "from-purple-500/20 to-blue-500/20",
              iconColor: "text-purple-400",
              border: "hover:border-purple-500/20",
            },
            {
              icon: <GitPullRequest className="w-5 h-5" />,
              title: "PR Risk Analysis",
              desc: "Deep pull request review with risk mapping, priority ranking, and line-by-line intelligence.",
              gradient: "from-blue-500/20 to-cyan-500/20",
              iconColor: "text-blue-400",
              border: "hover:border-blue-500/20",
            },
            {
              icon: <FileDiff className="w-5 h-5" />,
              title: "Diff & Code Scanner",
              desc: "Paste any code or diff — detect security vulnerabilities, anti-patterns, and complexity issues.",
              gradient: "from-orange-500/20 to-red-500/20",
              iconColor: "text-orange-400",
              border: "hover:border-orange-500/20",
            },
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              className={`glass rounded-2xl p-6 text-left transition-all duration-300 border border-transparent ${feat.border} hover:bg-white/[0.04] cursor-default group`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-4 ${feat.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                {feat.icon}
              </div>
              <h3 className="font-semibold mb-1.5 text-sm">{feat.title}</h3>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 flex items-center gap-2 text-[11px] text-muted-foreground/30"
      >
        <div className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
        Built for AMD Developer Hackathon ACT II · Unicorn Track
        <div className="w-1 h-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
      </motion.div>
    </div>
  );
}
