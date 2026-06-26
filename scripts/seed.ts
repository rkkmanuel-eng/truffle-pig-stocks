import Database from "better-sqlite3";
import path from "path";

const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/api/v3";
const DB_DIR = process.env.DB_DIR || process.cwd();

const db = new Database(path.join(DB_DIR, "data.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Create all tables ---

db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    price REAL,
    pe_ratio REAL,
    pb_ratio REAL,
    debt_equity_ratio REAL,
    current_ratio REAL,
    dividend_yield REAL,
    payout_ratio REAL,
    sma_50 REAL,
    sma_200 REAL,
    dcf_value REAL,
    peg_ratio REAL,
    market_cap REAL,
    beta REAL,
    volume_avg REAL,
    eps REAL,
    week52_high REAL,
    week52_low REAL,
    industry TEXT,
    exchange TEXT,
    is_dow INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    strategy_slug TEXT,
    symbol TEXT,
    buffer_percent REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(phone, strategy_slug, symbol)
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER REFERENCES subscriptions(id),
    message TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qualification_history (
    symbol TEXT NOT NULL,
    strategy_slug TEXT NOT NULL,
    first_qualified_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (symbol, strategy_slug)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    verification_expires TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscription_qualifications (
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
    symbol TEXT NOT NULL,
    PRIMARY KEY (subscription_id, symbol)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dividend_streaks (
    symbol TEXT PRIMARY KEY,
    streak_years INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS etfs (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    price REAL,
    aum REAL,
    expense_ratio REAL,
    ytd_return REAL,
    avg_volume REAL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log("Tables created.");

// --- FMP API helpers ---

async function fetchJson<T>(url: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}apikey=${API_KEY}`);
  if (!res.ok) throw new Error(`FMP API error: ${res.status} for ${url}`);
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Symbol lists ---

const DOW_SYMBOLS = [
  "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "DOW",
  "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "MRK",
  "MSFT", "NKE", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WBA", "WMT",
];

const SP500_SAMPLE = [
  ...DOW_SYMBOLS,
  "GOOGL", "AMZN", "META", "TSLA", "NVDA", "BRK-B", "LLY", "AVGO", "XOM",
  "PEP", "COST", "ADBE", "NFLX", "AMD", "QCOM", "INTC", "CMCSA", "TXN",
  "PM", "ABT", "DHR", "NEE", "LIN", "BMY", "ORCL", "ACN", "MDT", "COP",
  "LOW", "T", "SCHW", "MS", "BLK", "GILD", "AMAT", "ADP", "PFE", "C",
  "USB", "SO", "DUK", "EMR", "CL", "APD", "ITW", "MMC", "GD", "FDX",
];

const ETF_SYMBOLS = [
  "SPY", "IVV", "VOO", "VTI", "QQQ", "VEA", "VTV", "BND", "AGG", "IEFA",
  "VUG", "IWF", "VIG", "IEMG", "VWO", "IWM", "GLD", "VGT", "VXUS", "VO",
  "SCHD", "IJR", "VB", "VCIT", "BSV",
];

// --- Prepared statements ---

const upsertStock = db.prepare(`
  INSERT INTO stocks (symbol, name, sector, price, pe_ratio, pb_ratio, debt_equity_ratio, current_ratio,
    dividend_yield, payout_ratio, sma_50, sma_200, dcf_value, peg_ratio, market_cap, beta, volume_avg,
    eps, week52_high, week52_low, industry, exchange, is_dow, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(symbol) DO UPDATE SET
    name=excluded.name, sector=excluded.sector, price=excluded.price,
    pe_ratio=excluded.pe_ratio, pb_ratio=excluded.pb_ratio,
    debt_equity_ratio=excluded.debt_equity_ratio, current_ratio=excluded.current_ratio,
    dividend_yield=excluded.dividend_yield, payout_ratio=excluded.payout_ratio,
    sma_50=excluded.sma_50, sma_200=excluded.sma_200,
    dcf_value=excluded.dcf_value, peg_ratio=excluded.peg_ratio,
    market_cap=excluded.market_cap, beta=excluded.beta,
    volume_avg=excluded.volume_avg, eps=excluded.eps,
    week52_high=excluded.week52_high, week52_low=excluded.week52_low,
    industry=excluded.industry, exchange=excluded.exchange,
    is_dow=excluded.is_dow, updated_at=datetime('now')
`);

const upsertEtf = db.prepare(`
  INSERT OR REPLACE INTO etfs (symbol, name, category, price, aum, expense_ratio, ytd_return, avg_volume)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const upsertStreak = db.prepare(`
  INSERT INTO dividend_streaks (symbol, streak_years)
  VALUES (?, ?)
  ON CONFLICT(symbol) DO UPDATE SET streak_years=excluded.streak_years, updated_at=datetime('now')
`);

// --- Fetch real stock data ---

async function seedStocksFromFMP() {
  console.log(`Fetching real data for ${SP500_SAMPLE.length} stocks from FMP...`);
  let count = 0;
  const batchSize = 5;

  for (let i = 0; i < SP500_SAMPLE.length; i += batchSize) {
    const batch = SP500_SAMPLE.slice(i, i + batchSize);

    try {
      const profiles = await fetchJson<any[]>(`${BASE_URL}/profile/${batch.join(",")}`);

      for (const p of profiles) {
        try {
          const [ratiosArr, keyMetricsArr, sma50Arr, sma200Arr, dcfArr] = await Promise.all([
            fetchJson<any[]>(`${BASE_URL}/ratios-ttm/${p.symbol}`).catch(() => []),
            fetchJson<any[]>(`${BASE_URL}/key-metrics-ttm/${p.symbol}`).catch(() => []),
            fetchJson<any[]>(`${BASE_URL}/technical_indicator/daily/${p.symbol}?period=50&type=sma`).catch(() => []),
            fetchJson<any[]>(`${BASE_URL}/technical_indicator/daily/${p.symbol}?period=200&type=sma`).catch(() => []),
            fetchJson<any[]>(`${BASE_URL}/discounted-cash-flow/${p.symbol}`).catch(() => []),
          ]);

          const ratios = ratiosArr[0] || {};
          const keyMetrics = keyMetricsArr[0] || {};
          const rangeParts = p.range?.split("-").map(Number);

          upsertStock.run(
            p.symbol,
            p.companyName,
            p.sector,
            p.price,
            ratios.peRatioTTM ?? null,
            ratios.priceToBookRatioTTM ?? null,
            ratios.debtEquityRatioTTM ?? null,
            ratios.currentRatioTTM ?? null,
            ratios.dividendYieldTTM ?? null,
            ratios.payoutRatioTTM ?? null,
            sma50Arr[0]?.sma ?? null,
            sma200Arr[0]?.sma ?? null,
            dcfArr[0]?.dcf ?? null,
            (keyMetrics as any).pegRatioTTM ?? null,
            p.mktCap ?? null,
            p.beta ?? null,
            p.volAvg ?? null,
            (keyMetrics as any).epsTTM ?? null,
            rangeParts?.[1] || null,
            rangeParts?.[0] || null,
            p.industry ?? null,
            p.exchangeShortName ?? null,
            DOW_SYMBOLS.includes(p.symbol) ? 1 : 0,
          );

          count++;
        } catch (err) {
          console.error(`  Failed: ${p.symbol}`, (err as Error).message);
        }
      }
    } catch (err) {
      console.error(`  Batch failed: ${batch.join(",")}`, (err as Error).message);
    }

    // Small delay between batches to avoid rate limits
    if (i + batchSize < SP500_SAMPLE.length) {
      await sleep(200);
    }
  }

  console.log(`Seeded ${count} stocks with real FMP data.`);
}

// --- Fetch real ETF data ---

async function seedETFsFromFMP() {
  console.log(`Fetching real data for ${ETF_SYMBOLS.length} ETFs from FMP...`);

  const ETF_CATEGORIES: Record<string, string> = {
    SPY: "Large Cap Blend", IVV: "Large Cap Blend", VOO: "Large Cap Blend",
    VTI: "Total Market", QQQ: "Large Cap Growth", VEA: "International",
    VTV: "Large Cap Value", BND: "Bond", AGG: "Bond", IEFA: "International",
    VUG: "Large Cap Growth", IWF: "Large Cap Growth", VIG: "Dividend",
    IEMG: "Emerging Markets", VWO: "Emerging Markets", IWM: "Small Cap Blend",
    GLD: "Commodity", VGT: "Sector - Tech", VXUS: "International",
    VO: "Mid Cap Blend", SCHD: "Dividend", IJR: "Small Cap Blend",
    VB: "Small Cap Blend", VCIT: "Bond", BSV: "Bond",
  };

  let count = 0;
  const batchSize = 5;

  for (let i = 0; i < ETF_SYMBOLS.length; i += batchSize) {
    const batch = ETF_SYMBOLS.slice(i, i + batchSize);
    try {
      const profiles = await fetchJson<any[]>(`${BASE_URL}/profile/${batch.join(",")}`);
      for (const p of profiles) {
        upsertEtf.run(
          p.symbol,
          p.companyName || p.symbol,
          ETF_CATEGORIES[p.symbol] || p.sector || "Other",
          p.price,
          p.mktCap || null,
          null, // expense_ratio not in profile endpoint
          null, // ytd_return not in profile endpoint
          p.volAvg || null,
        );
        count++;
      }
    } catch (err) {
      console.error(`  ETF batch failed: ${batch.join(",")}`, (err as Error).message);
    }
    if (i + batchSize < ETF_SYMBOLS.length) await sleep(200);
  }

  console.log(`Seeded ${count} ETFs with real FMP data.`);
}

// --- Dividend streaks (hardcoded — cron job updates from FMP history) ---

function seedDividendStreaks() {
  const streaks: [string, number][] = [
    ["PG", 68], ["EMR", 67], ["MMM", 65], ["KO", 62], ["JNJ", 62], ["CL", 61],
    ["LOW", 52], ["ABT", 52], ["ITW", 51], ["PEP", 52], ["WMT", 51],
    ["MCD", 48], ["ADP", 49], ["SHW", 46], ["MDT", 46], ["XOM", 41], ["APD", 41],
    ["CVX", 37], ["NEE", 29], ["GD", 32], ["CAT", 30], ["LIN", 31], ["BDX", 28],
    ["MSFT", 22], ["HD", 16], ["CSCO", 13], ["TXN", 21], ["AMGN", 13], ["BLK", 15],
    ["USB", 14], ["SO", 23], ["DUK", 19], ["HON", 14], ["ACN", 19], ["MMC", 15],
    ["COST", 20], ["AVGO", 14], ["QCOM", 21], ["NKE", 22], ["V", 16], ["UNH", 15],
    ["TRV", 20], ["PM", 16], ["JPM", 14], ["MRK", 13],
  ];

  db.transaction(() => {
    for (const [symbol, years] of streaks) {
      upsertStreak.run(symbol, years);
    }
  })();

  console.log(`Seeded ${streaks.length} dividend streaks.`);
}

// --- Main ---

async function main() {
  if (!API_KEY) {
    console.log("No FMP_API_KEY — skipping live data fetch. Tables created only.");
    seedDividendStreaks();
    db.close();
    return;
  }

  try {
    await seedStocksFromFMP();
  } catch (err) {
    console.error("Stock seeding failed:", (err as Error).message);
  }

  try {
    await seedETFsFromFMP();
  } catch (err) {
    console.error("ETF seeding failed:", (err as Error).message);
  }

  seedDividendStreaks();
  db.close();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed script error:", err);
  db.close();
  process.exit(1);
});
