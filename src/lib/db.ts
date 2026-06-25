import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db: Database.Database) {
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
}

export interface StockRow {
  symbol: string;
  name: string;
  sector: string | null;
  price: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  debt_equity_ratio: number | null;
  current_ratio: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
  sma_50: number | null;
  sma_200: number | null;
  is_dow: number;
  updated_at: string;
}

export interface SubscriptionRow {
  id: number;
  phone: string;
  strategy_slug: string | null;
  symbol: string | null;
  buffer_percent: number;
  active: number;
  created_at: string;
}

export function getAllStocks(): StockRow[] {
  return getDb().prepare("SELECT * FROM stocks ORDER BY symbol").all() as StockRow[];
}

export function getStocksBySymbols(symbols: string[]): StockRow[] {
  if (symbols.length === 0) return [];
  const placeholders = symbols.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT * FROM stocks WHERE symbol IN (${placeholders}) ORDER BY symbol`)
    .all(...symbols) as StockRow[];
}

export function upsertStock(stock: Omit<StockRow, "updated_at">) {
  getDb()
    .prepare(
      `INSERT INTO stocks (symbol, name, sector, price, pe_ratio, pb_ratio, debt_equity_ratio, current_ratio, dividend_yield, payout_ratio, sma_50, sma_200, is_dow)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(symbol) DO UPDATE SET
         name=excluded.name, sector=excluded.sector, price=excluded.price,
         pe_ratio=excluded.pe_ratio, pb_ratio=excluded.pb_ratio,
         debt_equity_ratio=excluded.debt_equity_ratio, current_ratio=excluded.current_ratio,
         dividend_yield=excluded.dividend_yield, payout_ratio=excluded.payout_ratio,
         sma_50=excluded.sma_50, sma_200=excluded.sma_200, is_dow=excluded.is_dow,
         updated_at=datetime('now')`
    )
    .run(
      stock.symbol, stock.name, stock.sector, stock.price,
      stock.pe_ratio, stock.pb_ratio, stock.debt_equity_ratio, stock.current_ratio,
      stock.dividend_yield, stock.payout_ratio, stock.sma_50, stock.sma_200, stock.is_dow
    );
}

export function addSubscription(phone: string, strategySlug: string | null, symbol: string | null, bufferPercent: number) {
  return getDb()
    .prepare(
      `INSERT INTO subscriptions (phone, strategy_slug, symbol, buffer_percent)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(phone, strategy_slug, symbol) DO UPDATE SET
         buffer_percent=excluded.buffer_percent, active=1`
    )
    .run(phone, strategySlug, symbol, bufferPercent);
}

export function removeSubscription(phone: string, strategySlug: string | null, symbol: string | null) {
  return getDb()
    .prepare(
      `UPDATE subscriptions SET active=0 WHERE phone=? AND strategy_slug IS ? AND symbol IS ?`
    )
    .run(phone, strategySlug, symbol);
}

export function getActiveSubscriptions(): SubscriptionRow[] {
  return getDb()
    .prepare("SELECT * FROM subscriptions WHERE active=1")
    .all() as SubscriptionRow[];
}

export function logAlert(subscriptionId: number, message: string) {
  getDb()
    .prepare("INSERT INTO alert_log (subscription_id, message) VALUES (?, ?)")
    .run(subscriptionId, message);
}

export function getDowStocks(): StockRow[] {
  return getDb()
    .prepare("SELECT * FROM stocks WHERE is_dow=1 ORDER BY dividend_yield DESC")
    .all() as StockRow[];
}

export function getStockCount(): number {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM stocks").get() as { count: number };
  return row.count;
}
