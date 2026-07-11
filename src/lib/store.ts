import type { AnyAnalysisResult } from "@/types";

const store = new Map<string, AnyAnalysisResult>();

export function saveAnalysis(result: AnyAnalysisResult): void {
  store.set(result.id, result);
  if (store.size > 50) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

export function getAnalysis(id: string): AnyAnalysisResult | undefined {
  return store.get(id);
}

export function hasAnalysis(id: string): boolean {
  return store.has(id);
}
