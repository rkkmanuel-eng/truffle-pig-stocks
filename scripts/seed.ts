import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data.db"));
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
`);

const insert = db.prepare(`
  INSERT OR REPLACE INTO stocks
    (symbol, name, sector, price, pe_ratio, pb_ratio, debt_equity_ratio, current_ratio, dividend_yield, payout_ratio, sma_50, sma_200, is_dow)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stocks = [
  // Value stocks (low P/E, low P/B, low debt, high current ratio)
  ["JNJ", "Johnson & Johnson", "Healthcare", 155.20, 10.5, 1.2, 0.35, 1.8, 0.032, 0.45, 153.0, 148.0, 1],
  ["PFE", "Pfizer Inc.", "Healthcare", 28.50, 9.8, 1.1, 0.42, 1.6, 0.058, 0.52, 27.0, 26.5, 0],
  ["IBM", "International Business Machines", "Technology", 168.30, 13.2, 1.4, 0.48, 1.55, 0.045, 0.55, 165.0, 160.0, 1],
  ["MMM", "3M Company", "Industrials", 98.50, 11.8, 1.3, 0.38, 1.7, 0.055, 0.60, 95.0, 92.0, 1],

  // Dividend stocks (high yield, reasonable payout)
  ["VZ", "Verizon Communications", "Telecom", 35.80, 7.2, 1.6, 1.2, 0.8, 0.068, 0.55, 34.5, 33.0, 1],
  ["T", "AT&T Inc.", "Telecom", 17.20, 6.8, 1.0, 1.1, 0.7, 0.065, 0.50, 16.8, 16.0, 0],
  ["PM", "Philip Morris International", "Consumer Staples", 95.40, 16.5, 0.8, 0.9, 0.9, 0.054, 0.72, 93.0, 90.0, 0],
  ["MO", "Altria Group", "Consumer Staples", 45.60, 9.2, 0.7, 0.6, 0.5, 0.082, 0.70, 44.0, 42.0, 0],
  ["KO", "The Coca-Cola Company", "Consumer Staples", 60.20, 24.5, 10.5, 1.5, 1.1, 0.031, 0.73, 59.0, 57.5, 1],
  ["WBA", "Walgreens Boots Alliance", "Healthcare", 22.10, 5.5, 0.8, 0.4, 0.9, 0.052, 0.35, 21.0, 20.0, 1],

  // Momentum stocks (price > SMA200, SMA50 > SMA200)
  ["AAPL", "Apple Inc.", "Technology", 195.00, 32.0, 48.0, 1.8, 1.0, 0.005, 0.15, 190.0, 178.0, 1],
  ["MSFT", "Microsoft Corporation", "Technology", 415.00, 36.0, 12.5, 0.3, 1.8, 0.007, 0.25, 410.0, 380.0, 1],
  ["NVDA", "NVIDIA Corporation", "Technology", 875.00, 65.0, 30.0, 0.4, 4.2, 0.001, 0.05, 860.0, 620.0, 0],
  ["AMZN", "Amazon.com Inc.", "Technology", 185.00, 60.0, 8.5, 0.6, 1.1, 0.0, 0.0, 180.0, 155.0, 1],
  ["META", "Meta Platforms Inc.", "Technology", 505.00, 28.0, 8.2, 0.2, 2.8, 0.004, 0.10, 495.0, 420.0, 0],
  ["GOOGL", "Alphabet Inc.", "Technology", 175.00, 25.0, 6.5, 0.1, 2.1, 0.0, 0.0, 170.0, 150.0, 0],
  ["TSLA", "Tesla Inc.", "Automotive", 255.00, 70.0, 15.0, 0.1, 1.7, 0.0, 0.0, 245.0, 220.0, 0],

  // Dow stocks for Dogs strategy
  ["HD", "The Home Depot", "Consumer Discretionary", 345.00, 22.0, 150.0, 5.0, 1.2, 0.025, 0.55, 340.0, 330.0, 1],
  ["CAT", "Caterpillar Inc.", "Industrials", 290.00, 16.0, 8.0, 1.5, 1.4, 0.017, 0.25, 285.0, 270.0, 1],
  ["JPM", "JPMorgan Chase & Co.", "Financials", 195.00, 11.5, 1.7, 1.2, 0.9, 0.023, 0.25, 190.0, 175.0, 1],
  ["GS", "Goldman Sachs Group", "Financials", 455.00, 15.0, 1.3, 2.5, 0.8, 0.022, 0.30, 445.0, 400.0, 1],
  ["UNH", "UnitedHealth Group", "Healthcare", 520.00, 22.0, 6.0, 0.7, 0.8, 0.014, 0.30, 510.0, 500.0, 1],
  ["CRM", "Salesforce Inc.", "Technology", 265.00, 55.0, 4.0, 0.2, 1.1, 0.006, 0.30, 260.0, 240.0, 1],
  ["V", "Visa Inc.", "Financials", 280.00, 30.0, 13.0, 0.6, 1.5, 0.008, 0.22, 275.0, 260.0, 1],
  ["BA", "Boeing Company", "Industrials", 215.00, -5.0, -8.0, -3.0, 1.1, 0.0, 0.0, 210.0, 200.0, 1],
  ["DIS", "Walt Disney Company", "Communication", 112.00, 22.0, 2.0, 0.4, 1.0, 0.008, 0.17, 108.0, 100.0, 1],
  ["NKE", "Nike Inc.", "Consumer Discretionary", 105.00, 28.0, 9.0, 0.8, 2.5, 0.014, 0.38, 100.0, 98.0, 1],
  ["MCD", "McDonald's Corporation", "Consumer Discretionary", 295.00, 25.0, -7.0, -6.0, 0.9, 0.021, 0.55, 290.0, 280.0, 1],
  ["AXP", "American Express", "Financials", 225.00, 19.0, 6.0, 2.0, 0.9, 0.012, 0.22, 220.0, 200.0, 1],
  ["CSCO", "Cisco Systems", "Technology", 52.00, 15.0, 5.0, 0.3, 1.5, 0.029, 0.45, 50.0, 48.0, 1],
  ["CVX", "Chevron Corporation", "Energy", 155.00, 11.0, 1.8, 0.15, 1.3, 0.040, 0.42, 150.0, 148.0, 1],
  ["DOW", "Dow Inc.", "Materials", 54.00, 18.0, 1.5, 0.7, 1.5, 0.052, 0.90, 52.0, 50.0, 1],
  ["HON", "Honeywell International", "Industrials", 205.00, 24.0, 8.0, 1.0, 1.2, 0.020, 0.48, 200.0, 195.0, 1],
  ["AMGN", "Amgen Inc.", "Healthcare", 285.00, 22.0, 18.0, 5.0, 1.4, 0.031, 0.65, 280.0, 270.0, 1],
  ["MRK", "Merck & Co.", "Healthcare", 125.00, 18.0, 6.5, 0.6, 1.3, 0.024, 0.42, 122.0, 118.0, 1],
  ["PG", "Procter & Gamble", "Consumer Staples", 160.00, 26.0, 8.0, 0.6, 0.7, 0.024, 0.62, 158.0, 153.0, 1],
  ["SHW", "Sherwin-Williams", "Materials", 335.00, 32.0, 25.0, 2.5, 0.9, 0.009, 0.28, 330.0, 310.0, 1],
  ["TRV", "Travelers Companies", "Financials", 220.00, 12.0, 1.8, 0.3, 0.4, 0.017, 0.20, 215.0, 200.0, 1],

  // Extra S&P stocks
  ["COST", "Costco Wholesale", "Consumer Staples", 720.00, 48.0, 15.0, 0.3, 1.0, 0.006, 0.28, 710.0, 660.0, 0],
  ["NFLX", "Netflix Inc.", "Communication", 620.00, 45.0, 15.0, 0.6, 1.2, 0.0, 0.0, 610.0, 500.0, 0],
  ["ADBE", "Adobe Inc.", "Technology", 550.00, 50.0, 18.0, 0.3, 1.2, 0.0, 0.0, 540.0, 510.0, 0],
  ["INTC", "Intel Corporation", "Technology", 35.00, -4.0, 1.0, 0.5, 1.6, 0.014, -0.10, 33.0, 35.5, 0],
  ["GILD", "Gilead Sciences", "Healthcare", 78.00, 12.5, 1.3, 0.45, 1.9, 0.038, 0.48, 76.0, 73.0, 0],
  ["ABT", "Abbott Laboratories", "Healthcare", 108.00, 30.0, 5.0, 0.4, 1.7, 0.019, 0.55, 105.0, 100.0, 0],
  ["C", "Citigroup Inc.", "Financials", 58.00, 8.5, 0.6, 1.5, 0.7, 0.036, 0.28, 56.0, 52.0, 0],
  ["USB", "U.S. Bancorp", "Financials", 42.00, 10.0, 1.2, 0.9, 0.8, 0.045, 0.42, 40.0, 38.0, 0],
];

const insertMany = db.transaction(() => {
  for (const s of stocks) {
    insert.run(...s);
  }
});

insertMany();
console.log(`Seeded ${stocks.length} stocks into data.db`);
db.close();
