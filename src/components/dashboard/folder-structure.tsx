"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, File, FolderOpen, Folder, TreePine } from "lucide-react";
import type { FolderNode } from "@/types";

interface FolderStructureProps {
  tree: FolderNode;
  maxDepth?: number;
}

function FolderItem({ node, depth }: { node: FolderNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";

  const colorByLang: Record<string, string> = {
    TypeScript: "text-blue-400",
    JavaScript: "text-yellow-400",
    Python: "text-green-400",
    Go: "text-cyan-400",
    Rust: "text-orange-400",
    HTML: "text-red-400",
    CSS: "text-purple-400",
    JSON: "text-gray-400",
    Markdown: "text-gray-400",
  };

  return (
    <div>
      <button
        onClick={() => isFolder && setOpen(!open)}
        className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-xs hover:bg-white/[0.04] transition-all duration-150 ${
          isFolder ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {isFolder ? (
          <>
            <ChevronRight
              className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            />
            {open ? (
              <FolderOpen className="w-3.5 h-3.5 text-blue-400/60" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-blue-400/60" />
            )}
          </>
        ) : (
          <>
            <span className="w-3" />
            <File className={`w-3.5 h-3.5 ${colorByLang[node.language || ""] || "text-gray-500/50"}`} />
          </>
        )}
        <span className="text-white/60 truncate">{node.name}</span>
        {isFolder && node.children && (
          <span className="text-muted-foreground/30 ml-auto text-[10px] font-mono">
            {node.children.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isFolder && open && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map((child) => (
              <FolderItem key={child.path} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FolderStructure({ tree, maxDepth = 6 }: FolderStructureProps) {
  const displayChildren = tree.children?.slice(0, 30) || [];

  return (
    <div className="glass rounded-2xl p-5 border border-white/[0.04]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 flex items-center justify-center border border-emerald-500/10">
          <TreePine className="w-4 h-4 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold">Folder Structure</h3>
      </div>
      <div className="font-mono text-xs max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {displayChildren.map((child) => (
          <FolderItem key={child.path} node={child} depth={0} />
        ))}
      </div>
    </div>
  );
}
