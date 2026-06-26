import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.env.DB_DIR || process.cwd(), "data.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
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

  addColumnIfMissing(db, "users", "email_verified", "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "users", "verification_token", "TEXT");
  addColumnIfMissing(db, "users", "verification_expires", "TEXT");

  addColumnIfMissing(db, "stocks", "dcf_value", "REAL");
  addColumnIfMissing(db, "stocks", "peg_ratio", "REAL");
  addColumnIfMissing(db, "stocks", "market_cap", "REAL");
  addColumnIfMissing(db, "stocks", "beta", "REAL");
  addColumnIfMissing(db, "stocks", "volume_avg", "REAL");
  addColumnIfMissing(db, "stocks", "eps", "REAL");
  addColumnIfMissing(db, "stocks", "week52_high", "REAL");
  addColumnIfMissing(db, "stocks", "week52_low", "REAL");
  addColumnIfMissing(db, "stocks", "industry", "TEXT");
  addColumnIfMissing(db, "stocks", "exchange", "TEXT");
  addColumnIfMissing(db, "stocks", "created_at", "TEXT");
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
  dcf_value: number | null;
  peg_ratio: number | null;
  market_cap: number | null;
  beta: number | null;
  volume_avg: number | null;
  eps: number | null;
  week52_high: number | null;
  week52_low: number | null;
  industry: string | null;
  exchange: string | null;
  is_dow: number;
  updated_at: string;
  created_at: string | null;
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

export function getStockBySymbol(symbol: string): StockRow | null {
  return (getDb().prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol) as StockRow) ?? null;
}

export function searchStocks(query: string): Pick<StockRow, "symbol" | "name" | "price">[] {
  const q = `%${query}%`;
  return getDb()
    .prepare("SELECT symbol, name, price FROM stocks WHERE symbol LIKE ? OR name LIKE ? ORDER BY symbol LIMIT 10")
    .all(q, q) as Pick<StockRow, "symbol" | "name" | "price">[];
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
      `INSERT INTO stocks (symbol, name, sector, price, pe_ratio, pb_ratio, debt_equity_ratio, current_ratio, dividend_yield, payout_ratio, sma_50, sma_200, dcf_value, peg_ratio, market_cap, beta, volume_avg, eps, week52_high, week52_low, industry, exchange, is_dow, created_at)
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
         is_dow=excluded.is_dow, updated_at=datetime('now')`
    )
    .run(
      stock.symbol, stock.name, stock.sector, stock.price,
      stock.pe_ratio, stock.pb_ratio, stock.debt_equity_ratio, stock.current_ratio,
      stock.dividend_yield, stock.payout_ratio, stock.sma_50, stock.sma_200,
      stock.dcf_value, stock.peg_ratio,
      stock.market_cap, stock.beta, stock.volume_avg, stock.eps,
      stock.week52_high, stock.week52_low, stock.industry, stock.exchange,
      stock.is_dow
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

export function recordQualification(symbol: string, strategySlug: string) {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO qualification_history (symbol, strategy_slug) VALUES (?, ?)`
    )
    .run(symbol, strategySlug);
}

export function removeQualification(symbol: string, strategySlug: string) {
  getDb()
    .prepare(`DELETE FROM qualification_history WHERE symbol=? AND strategy_slug=?`)
    .run(symbol, strategySlug);
}

export function getQualifications(strategySlug: string): Record<string, string> {
  const rows = getDb()
    .prepare(`SELECT symbol, first_qualified_at FROM qualification_history WHERE strategy_slug=?`)
    .all(strategySlug) as { symbol: string; first_qualified_at: string }[];
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.symbol] = row.first_qualified_at;
  }
  return map;
}

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  email_verified: number;
  verification_token: string | null;
  verification_expires: string | null;
  created_at: string;
}

export function createUser(email: string, passwordHash: string, name: string): UserRow {
  const result = getDb()
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email, passwordHash, name);
  return getUserById(result.lastInsertRowid as number)!;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;
}

export function getUserById(id: number): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
}

export function updateUserPhone(userId: number, phone: string) {
  getDb()
    .prepare("UPDATE users SET phone = ? WHERE id = ?")
    .run(phone, userId);
}

export function updateUserName(userId: number, name: string) {
  getDb()
    .prepare("UPDATE users SET name = ? WHERE id = ?")
    .run(name, userId);
}

export function getUserSubscriptions(phone: string): SubscriptionRow[] {
  return getDb()
    .prepare("SELECT * FROM subscriptions WHERE phone = ? AND active = 1")
    .all(phone) as SubscriptionRow[];
}

export function getSubscriptionById(id: number): SubscriptionRow | null {
  return (getDb().prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as SubscriptionRow) ?? null;
}

export function deleteSubscription(id: number) {
  getDb().prepare("UPDATE subscriptions SET active = 0 WHERE id = ?").run(id);
}

export function updateSubscriptionBuffer(id: number, bufferPercent: number) {
  getDb().prepare("UPDATE subscriptions SET buffer_percent = ? WHERE id = ?").run(bufferPercent, id);
}

export function getSubscriptionQualifications(subscriptionId: number): Set<string> {
  const rows = getDb()
    .prepare("SELECT symbol FROM subscription_qualifications WHERE subscription_id = ?")
    .all(subscriptionId) as { symbol: string }[];
  return new Set(rows.map((r) => r.symbol));
}

export function setSubscriptionQualifications(subscriptionId: number, symbols: string[]) {
  const db = getDb();
  const del = db.prepare("DELETE FROM subscription_qualifications WHERE subscription_id = ?");
  const ins = db.prepare("INSERT INTO subscription_qualifications (subscription_id, symbol) VALUES (?, ?)");
  db.transaction(() => {
    del.run(subscriptionId);
    for (const sym of symbols) {
      ins.run(subscriptionId, sym);
    }
  })();
}

export interface FeedbackRow {
  id: number;
  user_id: number | null;
  category: string;
  message: string;
  created_at: string;
}

export function createFeedback(userId: number | null, category: string, message: string) {
  getDb()
    .prepare("INSERT INTO feedback (user_id, category, message) VALUES (?, ?, ?)")
    .run(userId, category, message);
}

export function upsertDividendStreak(symbol: string, streakYears: number) {
  getDb()
    .prepare(
      `INSERT INTO dividend_streaks (symbol, streak_years)
       VALUES (?, ?)
       ON CONFLICT(symbol) DO UPDATE SET
         streak_years=excluded.streak_years, updated_at=datetime('now')`
    )
    .run(symbol, streakYears);
}

export function setVerificationToken(userId: number, token: string, expiresAt: string) {
  getDb()
    .prepare("UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?")
    .run(token, expiresAt, userId);
}

export function verifyUserEmail(token: string): boolean {
  const user = getDb()
    .prepare("SELECT id, verification_expires FROM users WHERE verification_token = ?")
    .get(token) as { id: number; verification_expires: string } | undefined;
  if (!user) return false;
  if (new Date(user.verification_expires) < new Date()) return false;
  getDb()
    .prepare("UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?")
    .run(user.id);
  return true;
}

export function getAllDividendStreaks(): Record<string, number> {
  const rows = getDb()
    .prepare("SELECT symbol, streak_years FROM dividend_streaks WHERE streak_years > 0")
    .all() as { symbol: string; streak_years: number }[];
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.symbol] = row.streak_years;
  }
  return map;
}
