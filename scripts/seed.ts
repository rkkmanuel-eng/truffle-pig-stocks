import Database from "better-sqlite3";
import path from "path";

const DB_DIR = process.env.DB_DIR || process.cwd();
const db = new Database(path.join(DB_DIR, "data.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

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
    is_dow INTEGER DEFAULT 0,
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

function addColumnIfMissing(table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

addColumnIfMissing("stocks", "dcf_value", "REAL");
addColumnIfMissing("stocks", "peg_ratio", "REAL");
addColumnIfMissing("stocks", "market_cap", "REAL");
addColumnIfMissing("stocks", "beta", "REAL");
addColumnIfMissing("stocks", "volume_avg", "REAL");
addColumnIfMissing("stocks", "eps", "REAL");
addColumnIfMissing("stocks", "week52_high", "REAL");
addColumnIfMissing("stocks", "week52_low", "REAL");
addColumnIfMissing("stocks", "industry", "TEXT");
addColumnIfMissing("stocks", "exchange", "TEXT");
addColumnIfMissing("stocks", "created_at", "TEXT");

console.log("Tables created.");

const DOW_SYMBOLS = [
  "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "DOW",
  "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "MRK",
  "MSFT", "NKE", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WBA", "WMT",
];

const STOCK_SYMBOLS = [
  ...DOW_SYMBOLS,
  "GOOGL", "AMZN", "META", "TSLA", "NVDA", "AVGO", "XOM",
  "PEP", "COST", "ADBE", "NFLX", "AMD", "QCOM", "INTC", "CMCSA", "TXN",
  "PM", "ABT", "DHR", "NEE", "LIN", "BMY", "ORCL", "ACN", "MDT", "COP",
  "LOW", "T", "SCHW", "MS", "BLK", "GILD", "AMAT", "ADP", "PFE", "C",
  "USB", "SO", "DUK", "EMR", "CL", "APD", "ITW", "MMC", "GD", "FDX",
  "LLY", "BRK.B", "TMO", "ISRG", "INTU", "SPGI", "SYK", "BKNG", "VRTX",
  "REGN", "BSX", "LRCX", "KLAC", "SNPS", "CDNS", "PANW", "CRWD", "MRVL",
  "ABNB", "FTNT", "DXCM", "MNST", "IDXX", "ODFL", "CTAS", "CPRT", "EW",
  "PYPL", "MELI", "ORLY", "AZO", "ROP", "MSCI", "KEYS", "TDG", "WST",
  "CME", "ICE", "MCO", "NDAQ", "CBOE", "CMG", "YUM", "SBUX", "DPZ",
  "WM", "RSG", "ECL", "STE", "POOL", "FAST", "ROK", "AME", "TRGP",
  "PSA", "AMT", "CCI", "EQIX", "O", "PLD", "SPG", "DLR", "WELL",
  "DE", "ETN", "PH", "IR", "GWW", "SWK", "NDSN",
  "ZTS", "DDOG", "SNOW", "NET", "WDAY", "TEAM", "MDB", "TTD",
  "NOW", "UBER", "COIN", "PLTR", "DASH", "SPOT",
  "WFC", "BAC", "GS", "AIG", "MET", "PRU", "ALL", "AFL", "PGR", "CB",
  "CI", "ELV", "HCA", "HUM", "CNC", "MOH",
  "RTX", "LMT", "NOC", "GE", "LHX", "HII", "TDY",
  "F", "GM", "TM", "RIVN",
  "AAL", "DAL", "UAL", "LUV", "ALK",
  "CVS", "WBA", "MCK", "ABC", "CAH",
  "UPS", "FDX", "CHRW", "XPO", "JBHT", "EXPD",
  "CARR", "JCI", "TT", "GNRC",
  "D", "AEP", "XEL", "ES", "WEC", "ED", "EXC", "PCG", "SRE", "AES",
  "OXY", "EOG", "SLB", "PSX", "VLO", "MPC", "HAL", "DVN", "FANG", "HES",
  "KMB", "CHD", "MO", "STZ", "BF.B", "TAP", "SAM",
  "TGT", "DLTR", "DG", "ROST", "TJX", "BURL",
  "LULU", "DECK", "ON", "SWKS", "MCHP", "MPWR",
  "FICO", "FIS", "GPN", "WEX", "JKHY",
  "A", "TMO", "DHR", "WAT", "PKI", "MTD", "BIO",
  "IT", "EPAM", "LDOS", "BAH", "ACN",
  "TMUS", "VZ", "T", "CHTR",
  "MA", "AXP",
  "HPQ", "DELL", "HPE", "NTAP",
  "CRM", "SAP", "HUBS", "VEEV", "DOCU", "ZS", "OKTA",
  "ANET", "CSCO", "JNPR", "MSI",
  "PXD", "CTRA", "EQT", "AR", "RRC",
  "NEM", "FCX", "SCCO", "CLF", "NUE", "STLD",
  "ALB", "LYB", "DOW", "CE", "EMN",
  "AVB", "EQR", "MAA", "UDR", "CPT", "ESS",
  "BXP", "VTR", "HST", "KIM", "REG", "FRT",
  "NXPI", "TER", "ENTG", "MKSI",
  "AOS", "SJM", "K", "GIS", "HRL", "CAG", "CPB",
  "HSY", "MDLZ", "MNST",
];

const uniqueSymbols = [...new Set(STOCK_SYMBOLS)];

const insertStock = db.prepare(`
  INSERT OR IGNORE INTO stocks (symbol, name, is_dow)
  VALUES (?, ?, ?)
`);

let inserted = 0;
db.transaction(() => {
  for (const symbol of uniqueSymbols) {
    const result = insertStock.run(symbol, symbol, DOW_SYMBOLS.includes(symbol) ? 1 : 0);
    if (result.changes > 0) inserted++;
  }
})();

console.log(`Inserted ${inserted} new stock placeholders (${uniqueSymbols.length} total symbols).`);

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

const upsertStreak = db.prepare(`
  INSERT INTO dividend_streaks (symbol, streak_years)
  VALUES (?, ?)
  ON CONFLICT(symbol) DO UPDATE SET streak_years=excluded.streak_years, updated_at=datetime('now')
`);

db.transaction(() => {
  for (const [symbol, years] of streaks) {
    upsertStreak.run(symbol, years);
  }
})();

console.log(`Seeded ${streaks.length} dividend streaks.`);

const ETF_SYMBOLS = [
  "SPY", "IVV", "VOO", "VTI", "QQQ", "VEA", "VTV", "BND", "AGG", "IEFA",
  "VUG", "IWF", "VIG", "IEMG", "VWO", "IWM", "GLD", "VGT", "VXUS", "VO",
  "SCHD", "IJR", "VB", "VCIT", "BSV",
];

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

const insertEtf = db.prepare(`
  INSERT OR IGNORE INTO etfs (symbol, name, category)
  VALUES (?, ?, ?)
`);

db.transaction(() => {
  for (const symbol of ETF_SYMBOLS) {
    insertEtf.run(symbol, symbol, ETF_CATEGORIES[symbol] || "Other");
  }
})();

console.log(`Seeded ${ETF_SYMBOLS.length} ETF placeholders.`);

db.close();
console.log("Seed complete (no API calls — use cron endpoints to populate data).");
