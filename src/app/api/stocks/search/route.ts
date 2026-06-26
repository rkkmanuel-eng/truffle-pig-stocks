import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  return NextResponse.json(searchStocks(q));
}
