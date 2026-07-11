import { NextRequest, NextResponse } from "next/server";
import { getAnalysis } from "@/lib/store";
import { mockAnalysis } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const result = getAnalysis(id);

  if (!result) {
    // Fallback to demo if ID matches demo pattern
    if (id === "demo-001") {
      return NextResponse.json({ result: mockAnalysis });
    }
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  return NextResponse.json({ result });
}
