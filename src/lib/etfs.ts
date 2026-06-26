import { getDb } from "./db";

export interface EtfMeta {
  symbol: string;
  name: string;
  category: string;
}

export interface EtfRow {
  symbol: string;
  name: string;
  category: string;
  price: number | null;
  aum: number | null;
  expense_ratio: number | null;
  ytd_return: number | null;
  avg_volume: number | null;
  updated_at: string | null;
}

export interface EtfDisplay {
  symbol: string;
  name: string;
  category: string;
  price: number | null;
  aum: number | null;
  expenseRatio: number | null;
  ytdReturn: number | null;
  avgVolume: number | null;
}

const TOP_25_ETFS: EtfMeta[] = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", category: "Large Cap Blend" },
  { symbol: "IVV", name: "iShares Core S&P 500 ETF", category: "Large Cap Blend" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", category: "Large Cap Blend" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", category: "Total Market" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", category: "Large Cap Growth" },
  { symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", category: "International" },
  { symbol: "VTV", name: "Vanguard Value ETF", category: "Large Cap Value" },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", category: "Bond" },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", category: "Bond" },
  { symbol: "IEFA", name: "iShares Core MSCI EAFE ETF", category: "International" },
  { symbol: "VUG", name: "Vanguard Growth ETF", category: "Large Cap Growth" },
  { symbol: "IWF", name: "iShares Russell 1000 Growth ETF", category: "Large Cap Growth" },
  { symbol: "VIG", name: "Vanguard Dividend Appreciation ETF", category: "Dividend" },
  { symbol: "IEMG", name: "iShares Core MSCI Emerging Markets ETF", category: "Emerging Markets" },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", category: "Emerging Markets" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", category: "Small Cap Blend" },
  { symbol: "GLD", name: "SPDR Gold Shares", category: "Commodity" },
  { symbol: "VGT", name: "Vanguard Information Technology ETF", category: "Sector - Tech" },
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF", category: "International" },
  { symbol: "VO", name: "Vanguard Mid-Cap ETF", category: "Mid Cap Blend" },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF", category: "Dividend" },
  { symbol: "IJR", name: "iShares Core S&P Small-Cap ETF", category: "Small Cap Blend" },
  { symbol: "VB", name: "Vanguard Small-Cap ETF", category: "Small Cap Blend" },
  { symbol: "VCIT", name: "Vanguard Intermediate-Term Corporate Bond ETF", category: "Bond" },
  { symbol: "BSV", name: "Vanguard Short-Term Bond ETF", category: "Bond" },
];

export function getTopEtfs(): EtfDisplay[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM etfs ORDER BY aum DESC")
    .all() as EtfRow[];

  if (rows.length === 0) {
    return TOP_25_ETFS.map((e) => ({
      symbol: e.symbol,
      name: e.name,
      category: e.category,
      price: null,
      aum: null,
      expenseRatio: null,
      ytdReturn: null,
      avgVolume: null,
    }));
  }

  return rows.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    category: r.category,
    price: r.price,
    aum: r.aum,
    expenseRatio: r.expense_ratio,
    ytdReturn: r.ytd_return,
    avgVolume: r.avg_volume,
  }));
}

export function upsertEtf(etf: Omit<EtfRow, "updated_at">) {
  const db = getDb();
  db.prepare(
    `INSERT INTO etfs (symbol, name, category, price, aum, expense_ratio, ytd_return, avg_volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET
       name=excluded.name, category=excluded.category, price=excluded.price,
       aum=excluded.aum, expense_ratio=excluded.expense_ratio,
       ytd_return=excluded.ytd_return, avg_volume=excluded.avg_volume,
       updated_at=datetime('now')`
  ).run(
    etf.symbol, etf.name, etf.category, etf.price,
    etf.aum, etf.expense_ratio, etf.ytd_return, etf.avg_volume
  );
}

export const ETF_SYMBOLS = TOP_25_ETFS.map((e) => e.symbol);
export const ETF_META = TOP_25_ETFS;
