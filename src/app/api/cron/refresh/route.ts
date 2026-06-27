import { NextRequest, NextResponse } from "next/server";
import { getStockCount } from "@/lib/db";
import { refreshAllStocks } from "@/lib/refresh-stocks";

export const maxDuration = 900;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const authorized =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const result = await refreshAllStocks();

  return NextResponse.json({
    ok: true,
    ...result,
    total: getStockCount(),
  });
}
