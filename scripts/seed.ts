import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.env.DB_DIR || process.cwd(), "data.db"));
db.pragma("journal_mode = WAL");

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
`);

// columns: symbol, name, sector, price, pe, pb, d/e, current, divYield, payout, sma50, sma200, dcf, peg, isDow
const insert = db.prepare(`
  INSERT OR REPLACE INTO stocks
    (symbol, name, sector, price, pe_ratio, pb_ratio, debt_equity_ratio, current_ratio, dividend_yield, payout_ratio, sma_50, sma_200, dcf_value, peg_ratio, is_dow)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stocks = [
  //                                                    price    pe    pb    d/e   cr   divY  payR  sma50  sma200  dcf     peg   dow
  ["JNJ",   "Johnson & Johnson",              "Healthcare",         155.20, 10.5, 1.2, 0.35, 1.8, 0.032, 0.45, 153, 148, 180,   1.8,  1],
  ["PFE",   "Pfizer Inc.",                     "Healthcare",          28.50,  9.8, 1.1, 0.42, 1.6, 0.058, 0.52,  27,  26.5, 35,  0.7,  0],
  ["IBM",   "International Business Machines", "Technology",         168.30, 13.2, 1.4, 0.48, 1.55,0.045, 0.55, 165, 160, 185,   1.5,  1],
  ["MMM",   "3M Company",                      "Industrials",        98.50, 11.8, 1.3, 0.38, 1.7, 0.055, 0.60,  95,  92, 120,   1.2,  1],

  ["VZ",    "Verizon Communications",          "Telecom",             35.80,  7.2, 1.6, 1.2,  0.8, 0.068, 0.55,  34.5, 33, 45,  1.1,  1],
  ["T",     "AT&T Inc.",                        "Telecom",             17.20,  6.8, 1.0, 1.1,  0.7, 0.065, 0.50,  16.8, 16, 22,  0.9,  0],
  ["PM",    "Philip Morris International",     "Consumer Staples",    95.40, 16.5, 0.8, 0.9,  0.9, 0.054, 0.72,  93,  90, 100,   1.6,  0],
  ["MO",    "Altria Group",                    "Consumer Staples",    45.60,  9.2, 0.7, 0.6,  0.5, 0.082, 0.70,  44,  42,  55,   0.8,  0],
  ["KO",    "The Coca-Cola Company",           "Consumer Staples",    60.20, 24.5, 10.5,1.5,  1.1, 0.031, 0.73,  59,  57.5, 58,  3.2,  1],
  ["WBA",   "Walgreens Boots Alliance",        "Healthcare",          22.10,  5.5, 0.8, 0.4,  0.9, 0.052, 0.35,  21,  20,  30,   0.6,  1],

  ["AAPL",  "Apple Inc.",                      "Technology",         195.00, 32.0, 48.0, 1.8, 1.0, 0.005, 0.15, 190, 178, 170,   2.5,  1],
  ["MSFT",  "Microsoft Corporation",           "Technology",         415.00, 36.0, 12.5, 0.3, 1.8, 0.007, 0.25, 410, 380, 390,   2.1,  1],
  ["NVDA",  "NVIDIA Corporation",              "Technology",         875.00, 65.0, 30.0, 0.4, 4.2, 0.001, 0.05, 860, 620, 650,   1.1,  0],
  ["AMZN",  "Amazon.com Inc.",                 "Technology",         185.00, 60.0,  8.5, 0.6, 1.1, 0.0,   0.0,  180, 155, 165,   1.8,  1],
  ["META",  "Meta Platforms Inc.",             "Technology",         505.00, 28.0,  8.2, 0.2, 2.8, 0.004, 0.10, 495, 420, 480,   1.3,  0],
  ["GOOGL", "Alphabet Inc.",                   "Technology",         175.00, 25.0,  6.5, 0.1, 2.1, 0.0,   0.0,  170, 150, 190,   1.4,  0],
  ["TSLA",  "Tesla Inc.",                      "Automotive",         255.00, 70.0, 15.0, 0.1, 1.7, 0.0,   0.0,  245, 220, 180,   3.5,  0],

  ["HD",    "The Home Depot",                  "Consumer Discretionary", 345.00,22.0,150.0,5.0,1.2,0.025,0.55, 340, 330, 320,   2.0,  1],
  ["CAT",   "Caterpillar Inc.",                "Industrials",        290.00, 16.0,  8.0, 1.5, 1.4, 0.017, 0.25, 285, 270, 270,   1.5,  1],
  ["JPM",   "JPMorgan Chase & Co.",            "Financials",         195.00, 11.5,  1.7, 1.2, 0.9, 0.023, 0.25, 190, 175, 210,   1.0,  1],
  ["GS",    "Goldman Sachs Group",             "Financials",         455.00, 15.0,  1.3, 2.5, 0.8, 0.022, 0.30, 445, 400, 420,   0.9,  1],
  ["UNH",   "UnitedHealth Group",              "Healthcare",         520.00, 22.0,  6.0, 0.7, 0.8, 0.014, 0.30, 510, 500, 550,   1.7,  1],
  ["CRM",   "Salesforce Inc.",                 "Technology",         265.00, 55.0,  4.0, 0.2, 1.1, 0.006, 0.30, 260, 240, 230,   2.8,  1],
  ["V",     "Visa Inc.",                       "Financials",         280.00, 30.0, 13.0, 0.6, 1.5, 0.008, 0.22, 275, 260, 300,   1.9,  1],
  ["BA",    "Boeing Company",                  "Industrials",        215.00, -5.0, -8.0,-3.0, 1.1, 0.0,   0.0,  210, 200, 250,   null, 1],
  ["DIS",   "Walt Disney Company",             "Communication",      112.00, 22.0,  2.0, 0.4, 1.0, 0.008, 0.17, 108, 100, 130,   2.2,  1],
  ["NKE",   "Nike Inc.",                       "Consumer Discretionary", 105.00,28.0, 9.0,0.8,2.5,0.014,0.38, 100,  98, 115,   2.4,  1],
  ["MCD",   "McDonald's Corporation",          "Consumer Discretionary", 295.00,25.0,-7.0,-6.0,0.9,0.021,0.55, 290, 280, 280,   2.3,  1],
  ["AXP",   "American Express",               "Financials",         225.00, 19.0,  6.0, 2.0, 0.9, 0.012, 0.22, 220, 200, 200,   1.2,  1],
  ["CSCO",  "Cisco Systems",                   "Technology",          52.00, 15.0,  5.0, 0.3, 1.5, 0.029, 0.45,  50,  48,  55,   1.6,  1],
  ["CVX",   "Chevron Corporation",             "Energy",             155.00, 11.0,  1.8, 0.15,1.3, 0.040, 0.42, 150, 148, 175,   0.8,  1],
  ["DOW",   "Dow Inc.",                        "Materials",           54.00, 18.0,  1.5, 0.7, 1.5, 0.052, 0.90,  52,  50,  60,   1.9,  1],
  ["HON",   "Honeywell International",         "Industrials",        205.00, 24.0,  8.0, 1.0, 1.2, 0.020, 0.48, 200, 195, 210,   2.0,  1],
  ["AMGN",  "Amgen Inc.",                      "Healthcare",         285.00, 22.0, 18.0, 5.0, 1.4, 0.031, 0.65, 280, 270, 310,   1.6,  1],
  ["MRK",   "Merck & Co.",                     "Healthcare",         125.00, 18.0,  6.5, 0.6, 1.3, 0.024, 0.42, 122, 118, 145,   1.3,  1],
  ["PG",    "Procter & Gamble",                "Consumer Staples",   160.00, 26.0,  8.0, 0.6, 0.7, 0.024, 0.62, 158, 153, 155,   3.0,  1],
  ["SHW",   "Sherwin-Williams",                "Materials",          335.00, 32.0, 25.0, 2.5, 0.9, 0.009, 0.28, 330, 310, 300,   2.5,  1],
  ["TRV",   "Travelers Companies",             "Financials",         220.00, 12.0,  1.8, 0.3, 0.4, 0.017, 0.20, 215, 200, 240,   1.0,  1],

  ["COST",  "Costco Wholesale",                "Consumer Staples",   720.00, 48.0, 15.0, 0.3, 1.0, 0.006, 0.28, 710, 660, 600,   3.8,  0],
  ["NFLX",  "Netflix Inc.",                    "Communication",      620.00, 45.0, 15.0, 0.6, 1.2, 0.0,   0.0,  610, 500, 550,   1.5,  0],
  ["ADBE",  "Adobe Inc.",                      "Technology",         550.00, 50.0, 18.0, 0.3, 1.2, 0.0,   0.0,  540, 510, 520,   2.1,  0],
  ["INTC",  "Intel Corporation",               "Technology",          35.00, -4.0,  1.0, 0.5, 1.6, 0.014,-0.10,  33,  35.5, 42, null,  0],
  ["GILD",  "Gilead Sciences",                 "Healthcare",          78.00, 12.5,  1.3, 0.45,1.9, 0.038, 0.48,  76,  73,  95,   0.9,  0],
  ["ABT",   "Abbott Laboratories",             "Healthcare",         108.00, 30.0,  5.0, 0.4, 1.7, 0.019, 0.55, 105, 100, 115,   2.3,  0],
  ["C",     "Citigroup Inc.",                  "Financials",          58.00,  8.5,  0.6, 1.5, 0.7, 0.036, 0.28,  56,  52,  75,   0.7,  0],
  ["USB",   "U.S. Bancorp",                   "Financials",          42.00, 10.0,  1.2, 0.9, 0.8, 0.045, 0.42,  40,  38,  52,   0.8,  0],
];

const insertMany = db.transaction(() => {
  for (const s of stocks) {
    insert.run(...s);
  }
});

insertMany();
console.log(`Seeded ${stocks.length} stocks into data.db`);

// Add week52_high, week52_low, beta data for 52-Week Low and Low Beta strategies
const addCol = (col: string, type: string) => {
  const cols = db.prepare(`PRAGMA table_info(stocks)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE stocks ADD COLUMN ${col} ${type}`);
  }
};
addCol("week52_high", "REAL");
addCol("week52_low", "REAL");
addCol("beta", "REAL");
addCol("market_cap", "REAL");

const updateExtras = db.prepare(`
  UPDATE stocks SET week52_high = ?, week52_low = ?, beta = ?, market_cap = ? WHERE symbol = ?
`);

const extras: [number, number, number, number, string][] = [
  // week52_high, week52_low, beta, market_cap, symbol
  [165.00, 140.00, 0.55, 375e9, "JNJ"],
  [ 32.00,  25.00, 0.70, 160e9, "PFE"],
  [175.00, 130.00, 0.75, 155e9, "IBM"],
  [110.00,  85.00, 0.90, 54e9,  "MMM"],
  [ 42.00,  30.00, 0.40, 150e9, "VZ"],
  [ 22.00,  14.50, 0.45, 123e9, "T"],
  [105.00,  88.00, 0.60, 148e9, "PM"],
  [ 52.00,  40.00, 0.55, 82e9,  "MO"],
  [ 65.00,  55.00, 0.55, 260e9, "KO"],
  [ 28.00,  15.00, 0.80, 19e9,  "WBA"],
  [200.00, 165.00, 1.25, 3000e9, "AAPL"],
  [430.00, 340.00, 0.90, 3100e9, "MSFT"],
  [950.00, 400.00, 1.70, 2150e9, "NVDA"],
  [195.00, 140.00, 1.15, 1900e9, "AMZN"],
  [530.00, 280.00, 1.30, 1300e9, "META"],
  [185.00, 130.00, 1.05, 2200e9, "GOOGL"],
  [300.00, 140.00, 2.00, 810e9,  "TSLA"],
  [360.00, 280.00, 1.00, 340e9,  "HD"],
  [310.00, 220.00, 1.05, 150e9,  "CAT"],
  [210.00, 155.00, 1.10, 560e9,  "JPM"],
  [480.00, 320.00, 1.35, 155e9,  "GS"],
  [560.00, 440.00, 0.70, 490e9,  "UNH"],
  [280.00, 210.00, 1.15, 255e9,  "CRM"],
  [295.00, 235.00, 0.95, 580e9,  "V"],
  [265.00, 160.00, 1.50, 130e9,  "BA"],
  [125.00,  85.00, 1.20, 205e9,  "DIS"],
  [130.00,  88.00, 1.10, 160e9,  "NKE"],
  [305.00, 255.00, 0.65, 212e9,  "MCD"],
  [240.00, 165.00, 1.20, 168e9,  "AXP"],
  [ 58.00,  44.00, 0.85, 213e9,  "CSCO"],
  [175.00, 135.00, 1.10, 290e9,  "CVX"],
  [ 60.00,  45.00, 1.25, 38e9,   "DOW"],
  [220.00, 175.00, 1.00, 135e9,  "HON"],
  [310.00, 250.00, 0.65, 153e9,  "AMGN"],
  [135.00, 100.00, 0.45, 315e9,  "MRK"],
  [170.00, 145.00, 0.40, 378e9,  "PG"],
  [355.00, 280.00, 1.10, 85e9,   "SHW"],
  [230.00, 170.00, 0.70, 51e9,   "TRV"],
  [740.00, 540.00, 0.75, 320e9,  "COST"],
  [650.00, 400.00, 1.40, 270e9,  "NFLX"],
  [580.00, 430.00, 1.25, 240e9,  "ADBE"],
  [ 50.00,  26.00, 1.60, 145e9,  "INTC"],
  [ 88.00,  62.00, 0.35, 98e9,   "GILD"],
  [120.00,  95.00, 0.70, 188e9,  "ABT"],
  [ 65.00,  40.00, 1.30, 96e9,   "C"],
  [ 48.00,  32.00, 1.00, 65e9,   "USB"],
];

const updateMany = db.transaction(() => {
  for (const e of extras) {
    updateExtras.run(...e);
  }
});

updateMany();
console.log(`Updated ${extras.length} stocks with week52/beta data`);

// Seed ETF data
db.exec(`
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

const insertEtf = db.prepare(`
  INSERT OR REPLACE INTO etfs
    (symbol, name, category, price, aum, expense_ratio, ytd_return, avg_volume)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const etfs = [
  ["SPY",  "SPDR S&P 500 ETF Trust",                      "Large Cap Blend",   590.00, 570e9,  0.0945, 14.2, 75000000],
  ["IVV",  "iShares Core S&P 500 ETF",                    "Large Cap Blend",   592.00, 530e9,  0.03,   14.3, 5500000],
  ["VOO",  "Vanguard S&P 500 ETF",                        "Large Cap Blend",   543.00, 500e9,  0.03,   14.2, 5200000],
  ["VTI",  "Vanguard Total Stock Market ETF",              "Total Market",      280.00, 430e9,  0.03,   13.8, 3800000],
  ["QQQ",  "Invesco QQQ Trust",                            "Large Cap Growth",  510.00, 310e9,  0.20,   17.5, 42000000],
  ["VEA",  "Vanguard FTSE Developed Markets ETF",          "International",      52.00, 130e9,  0.05,    8.2, 9500000],
  ["VTV",  "Vanguard Value ETF",                           "Large Cap Value",   172.00, 120e9,  0.04,    9.1, 2200000],
  ["BND",  "Vanguard Total Bond Market ETF",               "Bond",               72.00, 115e9,  0.03,    1.8, 6500000],
  ["AGG",  "iShares Core U.S. Aggregate Bond ETF",         "Bond",               99.00, 110e9,  0.03,    1.7, 7200000],
  ["IEFA", "iShares Core MSCI EAFE ETF",                   "International",      78.00, 105e9,  0.07,    8.5, 10000000],
  ["VUG",  "Vanguard Growth ETF",                          "Large Cap Growth",  385.00, 100e9,  0.04,   18.2, 1200000],
  ["IWF",  "iShares Russell 1000 Growth ETF",              "Large Cap Growth",  390.00,  95e9,  0.19,   17.8, 1500000],
  ["VIG",  "Vanguard Dividend Appreciation ETF",           "Dividend",          195.00,  90e9,  0.06,   10.5, 1800000],
  ["IEMG", "iShares Core MSCI Emerging Markets ETF",       "Emerging Markets",   55.00,  85e9,  0.09,    5.2, 12000000],
  ["VWO",  "Vanguard FTSE Emerging Markets ETF",           "Emerging Markets",   44.00,  80e9,  0.08,    4.8, 8000000],
  ["IWM",  "iShares Russell 2000 ETF",                    "Small Cap Blend",   220.00,  72e9,  0.19,    6.3, 22000000],
  ["GLD",  "SPDR Gold Shares",                             "Commodity",         238.00,  70e9,  0.40,   12.5, 6000000],
  ["VGT",  "Vanguard Information Technology ETF",          "Sector - Tech",     580.00,  68e9,  0.10,   19.1, 500000],
  ["VXUS", "Vanguard Total International Stock ETF",       "International",      60.00,  65e9,  0.07,    7.8, 3500000],
  ["VO",   "Vanguard Mid-Cap ETF",                         "Mid Cap Blend",     260.00,  62e9,  0.04,    8.9, 700000],
  ["SCHD", "Schwab U.S. Dividend Equity ETF",              "Dividend",           82.00,  60e9,  0.06,    9.2, 4500000],
  ["IJR",  "iShares Core S&P Small-Cap ETF",               "Small Cap Blend",   112.00,  55e9,  0.06,    5.8, 3200000],
  ["VB",   "Vanguard Small-Cap ETF",                       "Small Cap Blend",   225.00,  52e9,  0.05,    6.1, 600000],
  ["VCIT", "Vanguard Intermediate-Term Corporate Bond ETF", "Bond",              82.00,  50e9,  0.04,    2.5, 3000000],
  ["BSV",  "Vanguard Short-Term Bond ETF",                 "Bond",               77.00,  48e9,  0.04,    2.1, 2800000],
];

const insertEtfs = db.transaction(() => {
  for (const e of etfs) {
    insertEtf.run(...e);
  }
});

insertEtfs();
console.log(`Seeded ${etfs.length} ETFs into data.db`);

// Seed dividend streak data
db.exec(`
  CREATE TABLE IF NOT EXISTS dividend_streaks (
    symbol TEXT PRIMARY KEY,
    streak_years INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

const insertStreak = db.prepare(`
  INSERT OR REPLACE INTO dividend_streaks (symbol, streak_years) VALUES (?, ?)
`);

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

const insertStreaks = db.transaction(() => {
  for (const [symbol, years] of streaks) {
    insertStreak.run(symbol, years);
  }
});

insertStreaks();
console.log(`Seeded ${streaks.length} dividend streaks into data.db`);
db.close();
