import { NextRequest, NextResponse } from "next/server";
import { getStockBySymbol } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const stock = getStockBySymbol(symbol.toUpperCase());

  if (!stock) {
    return NextResponse.json({ error: "Stock not found" }, { status: 404 });
  }

  return NextResponse.json(stock);
}
