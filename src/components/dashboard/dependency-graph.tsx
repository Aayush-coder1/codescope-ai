"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { GitBranch, FileCode2, Shield, Zap, AlertTriangle } from "lucide-react";
import { FileChange, DependencyEdge } from "@/types";

interface DependencyGraphProps {
  files: FileChange[];
  dependencies: DependencyEdge[];
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    default: return "#22c55e";
  }
}

function getRiskGlow(risk: string): string {
  switch (risk) {
    case "critical": return "0 0 20px #ef444440, 0 0 40px #ef444420";
    case "high": return "0 0 16px #f9731640, 0 0 32px #f9731620";
    case "medium": return "0 0 12px #eab30830";
    default: return "0 0 10px #22c55e20";
  }
}

function getRiskBg(risk: string): string {
  switch (risk) {
    case "critical": return "rgba(239,68,68,0.06)";
    case "high": return "rgba(249,115,22,0.06)";
    case "medium": return "rgba(234,179,8,0.04)";
    default: return "rgba(34,197,94,0.03)";
  }
}

function getFileIcon(risk: string) {
  switch (risk) {
    case "critical": return <AlertTriangle className="w-3.5 h-3.5" />;
    case "high": return <Shield className="w-3.5 h-3.5" />;
    case "medium": return <Zap className="w-3.5 h-3.5" />;
    default: return <FileCode2 className="w-3.5 h-3.5" />;
  }
}

function getEdgeColor(type: string): { stroke: string; glow: string } {
  if (type === "import") return { stroke: "#60a5fa", glow: "#60a5fa40" };
  if (type === "require") return { stroke: "#a78bfa", glow: "#a78bfa40" };
  return { stroke: "#94a3b8", glow: "#94a3b840" };
}

export function DependencyGraph({ files, dependencies }: DependencyGraphProps) {
  const initialNodes: Node[] = useMemo(() => {
    const cols = Math.min(5, files.length);
    const colWidth = 280;
    const rowHeight = 160;
    const offsetX = 60;
    const offsetY = 40;

    return files.map((file, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const riskColor = getRiskColor(file.risk);

      return {
        id: file.path,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: {
          x: col * colWidth + offsetX,
          y: row * rowHeight + offsetY,
        },
        data: {
          label: (
            <div
              className="flex flex-col items-center gap-2 min-w-[160px] py-1"
              style={{ filter: `drop-shadow(${getRiskGlow(file.risk)})` }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${riskColor}20, ${riskColor}08)`,
                  border: `1.5px solid ${riskColor}40`,
                  color: riskColor,
                }}
              >
                {getFileIcon(file.risk)}
              </div>
              <div className="text-center">
                <span className="text-[12px] font-semibold text-white/90 block leading-tight">
                  {file.path.split("/").pop()}
                </span>
                <span className="text-[10px] text-white/40 block mt-0.5 font-mono">
                  {file.path.split("/").slice(-2, -1).join("/") + "/"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-green-400/80">+{file.additions}</span>
                <span className="text-red-400/80">-{file.deletions}</span>
                <span className="text-muted-foreground/50">cpx:{file.complexity}</span>
              </div>
              <div
                className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider"
                style={{
                  background: `${riskColor}15`,
                  color: riskColor,
                  border: `1px solid ${riskColor}25`,
                }}
              >
                {file.risk}
              </div>
            </div>
          ),
        },
        style: {
          background: getRiskBg(file.risk),
          border: `1px solid ${riskColor}20`,
          borderRadius: "18px",
          padding: "12px",
          backdropFilter: "blur(12px)",
          boxShadow: getRiskGlow(file.risk),
        },
      };
    });
  }, [files]);

  const initialEdges: Edge[] = useMemo(() => {
    return dependencies.map((dep, i) => {
      const colors = getEdgeColor(dep.type);
      return {
        id: `e-${i}`,
        source: dep.source,
        target: dep.target,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: colors.stroke,
          strokeWidth: Math.max(1.5, Math.min(dep.weight, 3)),
          filter: `drop-shadow(0 0 4px ${colors.glow})`,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colors.stroke,
          width: 16,
          height: 16,
        },
      };
    });
  }, [dependencies]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeCount = files.length;
  const edgeCount = dependencies.length;
  const height = Math.max(400, Math.min(600, Math.ceil(nodeCount / 5) * 160 + 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="glass rounded-2xl p-5 border border-white/[0.04]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 flex items-center justify-center border border-cyan-500/10">
            <GitBranch className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Dependency Graph</h3>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              {nodeCount} nodes · {edgeCount} edges
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ background: "#60a5fa" }} />
            <span className="text-muted-foreground/50">import</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ background: "#a78bfa" }} />
            <span className="text-muted-foreground/50">require</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {["critical", "high", "medium", "low"].map((risk) => (
              <div key={risk} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: getRiskColor(risk) }} />
                <span className="text-muted-foreground/40 capitalize">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden border border-white/[0.04] bg-gradient-to-br from-white/[0.01] to-transparent"
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background color="rgba(255,255,255,0.02)" gap={24} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-white/5 !border-white/10 !rounded-xl !shadow-lg !backdrop-blur-xl"
          />
        </ReactFlow>
      </div>
    </motion.div>
  );
}
