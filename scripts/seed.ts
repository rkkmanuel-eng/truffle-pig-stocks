import Database from "better-sqlite3";
import path from "path";

const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/stable";
const DB_DIR = process.env.DB_DIR || process.cwd();
const MIN_MARKET_CAP = 300_000_000;

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

// --- Discover US stocks dynamically ---

async function discoverStocks(): Promise<string[]> {
  console.log("Discovering US stocks via search-symbol...");
  const allSymbols = new Set<string>();
  const exchanges = ["NYSE", "NASDAQ", "AMEX"];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  for (const exchange of exchanges) {
    for (const letter of letters) {
      try {
        const data = await fetchJson<{ symbol: string; name: string }[]>(
          `${BASE_URL}/search-symbol?query=${letter}&exchange=${exchange}&limit=500`
        );
        if (Array.isArray(data)) {
          for (const d of data) {
            if (!d.symbol.includes(".") && !d.symbol.includes("-") && !d.symbol.startsWith("^")) {
              allSymbols.add(d.symbol);
            }
          }
        }
      } catch {}
      await sleep(150);
    }
    console.log(`  ${exchange}: ${allSymbols.size} total symbols`);
  }

  console.log(`  Discovered ${allSymbols.size} candidate symbols. Filtering by market cap...`);
  return [...allSymbols].sort();
}

async function filterByMarketCap(symbols: string[]): Promise<string[]> {
  const qualified: string[] = [];
  let checked = 0;

  for (const symbol of symbols) {
    try {
      const data = await fetchJson<any[]>(`${BASE_URL}/quote?symbol=${symbol}`);
      const q = data[0];
      if (q && q.marketCap >= MIN_MARKET_CAP) {
        qualified.push(symbol);
      }
    } catch {}

    checked++;
    if (checked % 50 === 0) {
      console.log(`  Checked ${checked}/${symbols.length}, qualified: ${qualified.length}`);
    }
    if (checked % 3 === 0) await sleep(600);
  }

  console.log(`  Qualified ${qualified.length} stocks with market cap >= $${(MIN_MARKET_CAP / 1e6).toFixed(0)}M`);
  return qualified;
}

// --- Fetch stock data ---

async function seedStockData(symbols: string[]) {
  console.log(`Fetching detailed data for ${symbols.length} stocks...`);
  let count = 0;

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    try {
      const [profileData, quoteData, ratiosData, dcfData] = await Promise.all([
        fetchJson<any[]>(`${BASE_URL}/profile?symbol=${symbol}`).catch(() => []),
        fetchJson<any[]>(`${BASE_URL}/quote?symbol=${symbol}`).catch(() => []),
        fetchJson<any[]>(`${BASE_URL}/ratios-ttm?symbol=${symbol}`).catch(() => []),
        fetchJson<any[]>(`${BASE_URL}/discounted-cash-flow?symbol=${symbol}`).catch(() => []),
      ]);

      const p = profileData[0] || {};
      const q = quoteData[0] || {};
      const r = ratiosData[0] || {};

      if (!p.companyName && !q.price) {
        continue;
      }

      upsertStock.run(
        symbol,
        p.companyName || symbol,
        p.sector || null,
        q.price ?? p.price ?? null,
        r.priceToEarningsRatioTTM ?? null,
        r.priceToBookRatioTTM ?? null,
        r.debtToEquityRatioTTM ?? null,
        r.currentRatioTTM ?? null,
        r.dividendYieldTTM ?? null,
        r.dividendPayoutRatioTTM ?? null,
        q.priceAvg50 ?? null,
        q.priceAvg200 ?? null,
        dcfData[0]?.dcf ?? null,
        r.priceToEarningsGrowthRatioTTM ?? null,
        q.marketCap ?? p.marketCap ?? null,
        p.beta ?? null,
        p.averageVolume ?? null,
        r.netIncomePerShareTTM ?? null,
        q.yearHigh ?? null,
        q.yearLow ?? null,
        p.industry ?? null,
        p.exchange ?? null,
        DOW_SYMBOLS.includes(symbol) ? 1 : 0,
      );

      count++;
    } catch (err) {
      console.error(`  Failed: ${symbol}`, (err as Error).message);
    }

    if ((i + 1) % 3 === 0 && i + 1 < symbols.length) {
      await sleep(4000);
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${symbols.length} (${count} seeded)`);
    }
  }

  console.log(`Seeded ${count} stocks with real FMP data.`);
}

// --- Fetch real ETF data ---

async function seedETFsFromFMP() {
  console.log(`Fetching data for ${ETF_SYMBOLS.length} ETFs...`);

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

  for (let i = 0; i < ETF_SYMBOLS.length; i++) {
    const symbol = ETF_SYMBOLS[i];
    try {
      const data = await fetchJson<any[]>(`${BASE_URL}/profile?symbol=${symbol}`);
      const p = data[0];
      if (p) {
        upsertEtf.run(
          p.symbol,
          p.companyName || p.symbol,
          ETF_CATEGORIES[p.symbol] || p.sector || "Other",
          p.price,
          p.marketCap || null,
          null,
          null,
          p.averageVolume || null,
        );
        count++;
      }
    } catch (err) {
      console.error(`  ETF failed: ${symbol}`, (err as Error).message);
    }
    if (i + 1 < ETF_SYMBOLS.length) await sleep(600);
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
    const candidates = await discoverStocks();
    const qualified = await filterByMarketCap(candidates);
    await seedStockData(qualified);
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
